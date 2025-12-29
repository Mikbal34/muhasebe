'use client'

import React, { useMemo, useState } from 'react'
import { CashFlowData, CashFlowNode, CashFlowLink, FLOW_COLORS } from './cash-flow-types'

interface CashFlowDiagramProps {
  data: CashFlowData
  width?: number
  height?: number
}

interface LayoutNode extends CashFlowNode {
  x: number
  y: number
  w: number
  h: number
}

interface LayoutLink extends CashFlowLink {
  path: string
  sourceY: number
  targetY: number
  thickness: number
}

// Para formatı
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value) + ' \u20BA'
}

// Bezier curve path oluştur
function createLinkPath(
  sx: number, sy: number, sw: number, sh: number,
  tx: number, ty: number, tw: number, th: number,
  linkThickness: number,
  sourceOffset: number,
  targetOffset: number
): string {
  const startX = sx + sw
  const startY = sy + sourceOffset + linkThickness / 2
  const endX = tx
  const endY = ty + targetOffset + linkThickness / 2

  const midX = (startX + endX) / 2

  return `
    M ${startX},${startY - linkThickness / 2}
    C ${midX},${startY - linkThickness / 2}
      ${midX},${endY - linkThickness / 2}
      ${endX},${endY - linkThickness / 2}
    L ${endX},${endY + linkThickness / 2}
    C ${midX},${endY + linkThickness / 2}
      ${midX},${startY + linkThickness / 2}
      ${startX},${startY + linkThickness / 2}
    Z
  `
}

export function CashFlowDiagram({
  data,
  width = 800,
  height = 400
}: CashFlowDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  // Layout hesapla
  const layout = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 20, left: 20 }
    const nodeWidth = 140
    const nodeGap = 16
    const columnGap = (width - padding.left - padding.right - nodeWidth * 3) / 2

    // Node'ları depth'e göre grupla
    const nodesByDepth: Record<number, CashFlowNode[]> = {}
    data.nodes.forEach(node => {
      if (!nodesByDepth[node.depth]) {
        nodesByDepth[node.depth] = []
      }
      nodesByDepth[node.depth].push(node)
    })

    // Her depth için toplam değer ve pozisyon hesapla
    const layoutNodes: LayoutNode[] = []

    // Depth 0 (Gelir) - Sol taraf
    const depth0Nodes = nodesByDepth[0] || []
    const totalValue0 = depth0Nodes.reduce((sum, n) => sum + n.value, 0) || 1
    let currentY0 = padding.top
    depth0Nodes.forEach(node => {
      const nodeHeight = Math.max(60, ((node.value / totalValue0) * (height - padding.top - padding.bottom - (depth0Nodes.length - 1) * nodeGap)))
      layoutNodes.push({
        ...node,
        x: padding.left,
        y: currentY0,
        w: nodeWidth,
        h: nodeHeight
      })
      currentY0 += nodeHeight + nodeGap
    })

    // Depth 1 (Kategoriler + Net) - Orta
    const depth1Nodes = nodesByDepth[1] || []
    // Değere göre sırala (büyükten küçüğe), net en alta
    const sortedDepth1 = [...depth1Nodes].sort((a, b) => {
      if (a.id === 'net') return 1
      if (b.id === 'net') return -1
      return b.value - a.value
    })

    const totalValue1 = data.totalIncome || 1
    const availableHeight1 = height - padding.top - padding.bottom - (sortedDepth1.length - 1) * nodeGap
    let currentY1 = padding.top

    sortedDepth1.forEach(node => {
      const nodeHeight = Math.max(40, (node.value / totalValue1) * availableHeight1)
      layoutNodes.push({
        ...node,
        x: padding.left + nodeWidth + columnGap,
        y: currentY1,
        w: nodeWidth,
        h: nodeHeight
      })
      currentY1 += nodeHeight + nodeGap
    })

    // Depth 2 (Alt kategoriler) - Sağ taraf
    const depth2Nodes = nodesByDepth[2] || []
    // Parent'a göre grupla
    const depth2ByParent: Record<string, CashFlowNode[]> = {}
    depth2Nodes.forEach(node => {
      const parentId = node.id.split('-sub-')[0]
      if (!depth2ByParent[parentId]) {
        depth2ByParent[parentId] = []
      }
      depth2ByParent[parentId].push(node)
    })

    // Her parent için alt kategorileri pozisyonla
    Object.entries(depth2ByParent).forEach(([parentId, children]) => {
      const parentNode = layoutNodes.find(n => n.id === parentId)
      if (!parentNode) return

      const totalChildValue = children.reduce((sum, c) => sum + c.value, 0)
      let childY = parentNode.y

      children.forEach(child => {
        const childHeight = Math.max(24, (child.value / totalChildValue) * parentNode.h)
        layoutNodes.push({
          ...child,
          x: padding.left + nodeWidth * 2 + columnGap * 2,
          y: childY,
          w: nodeWidth,
          h: childHeight
        })
        childY += childHeight + 4
      })
    })

    // Link'leri hesapla
    const layoutLinks: LayoutLink[] = []
    const sourceOffsets: Record<string, number> = {}
    const targetOffsets: Record<string, number> = {}

    data.links.forEach(link => {
      const sourceNode = layoutNodes.find(n => n.id === link.source)
      const targetNode = layoutNodes.find(n => n.id === link.target)

      if (!sourceNode || !targetNode) return

      // Link kalınlığını hesapla
      const maxThickness = Math.min(sourceNode.h, targetNode.h) * 0.8
      const thickness = Math.max(4, (link.value / data.totalIncome) * maxThickness * 3)

      // Offset'leri takip et
      if (!sourceOffsets[link.source]) sourceOffsets[link.source] = 0
      if (!targetOffsets[link.target]) targetOffsets[link.target] = 0

      const sourceOffset = sourceOffsets[link.source]
      const targetOffset = targetOffsets[link.target]

      const path = createLinkPath(
        sourceNode.x, sourceNode.y, sourceNode.w, sourceNode.h,
        targetNode.x, targetNode.y, targetNode.w, targetNode.h,
        thickness,
        sourceOffset,
        targetOffset
      )

      layoutLinks.push({
        ...link,
        path,
        sourceY: sourceNode.y + sourceOffset,
        targetY: targetNode.y + targetOffset,
        thickness
      })

      sourceOffsets[link.source] += thickness + 2
      targetOffsets[link.target] += thickness + 2
    })

    return { nodes: layoutNodes, links: layoutLinks }
  }, [data, width, height])

  // Veri yoksa boş state göster
  if (!data.nodes.length) {
    return (
      <div
        className="flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700"
        style={{ width, height }}
      >
        <div className="text-center text-slate-400">
          <p className="text-sm">Bu dönem için veri bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        style={{ background: 'transparent' }}
      >
        {/* Gradient definitions */}
        <defs>
          {/* Animated gradient for flow effect */}
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)">
              <animate
                attributeName="offset"
                values="-1;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)">
              <animate
                attributeName="offset"
                values="-0.5;1.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)">
              <animate
                attributeName="offset"
                values="0;2"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>

          {/* Drop shadow for nodes */}
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Links */}
        <g className="links">
          {layout.links.map((link, index) => {
            const isHighlighted = hoveredNode === link.source || hoveredNode === link.target || hoveredLink === `${link.source}-${link.target}`
            return (
              <g key={`${link.source}-${link.target}-${index}`}>
                <path
                  d={link.path}
                  fill={link.color}
                  fillOpacity={isHighlighted ? 0.7 : 0.4}
                  className="transition-all duration-300"
                  onMouseEnter={() => setHoveredLink(`${link.source}-${link.target}`)}
                  onMouseLeave={() => setHoveredLink(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Animated overlay for flow effect */}
                <path
                  d={link.path}
                  fill="url(#flowGradient)"
                  fillOpacity={isHighlighted ? 0.4 : 0.2}
                  className="pointer-events-none"
                />
              </g>
            )
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {layout.nodes.map((node) => {
            const isHighlighted = hoveredNode === node.id
            const isConnected = layout.links.some(
              l => (l.source === node.id || l.target === node.id) &&
                   (hoveredNode === l.source || hoveredNode === l.target)
            )

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node background */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={8}
                  fill={node.color}
                  fillOpacity={isHighlighted ? 1 : 0.85}
                  filter={isHighlighted ? 'url(#nodeShadow)' : undefined}
                  className="transition-all duration-200"
                  stroke={isHighlighted || isConnected ? 'white' : 'transparent'}
                  strokeWidth={isHighlighted ? 2 : 1}
                />

                {/* Node content */}
                <foreignObject
                  x={node.x + 8}
                  y={node.y + 4}
                  width={node.w - 16}
                  height={node.h - 8}
                >
                  <div className="flex flex-col justify-center h-full text-white">
                    <span
                      className="font-medium truncate"
                      style={{ fontSize: node.h < 50 ? '11px' : '13px' }}
                    >
                      {node.label}
                    </span>
                    <span
                      className="font-bold"
                      style={{ fontSize: node.h < 50 ? '12px' : '15px' }}
                    >
                      {formatCurrency(node.value)}
                    </span>
                  </div>
                </foreignObject>

                {/* Expand indicator for depth 1 nodes with children */}
                {node.depth === 1 && node.id !== 'net' && layout.links.some(l => l.source === node.id) && (
                  <circle
                    cx={node.x + node.w - 12}
                    cy={node.y + node.h / 2}
                    r={8}
                    fill="rgba(255,255,255,0.2)"
                    className="transition-all duration-200"
                  />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute top-2 right-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm shadow-lg z-10">
          {(() => {
            const node = layout.nodes.find(n => n.id === hoveredNode)
            if (!node) return null

            const percentage = ((node.value / data.totalIncome) * 100).toFixed(1)

            return (
              <div className="text-white">
                <div className="font-semibold flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                  {node.label}
                </div>
                <div className="text-slate-300 mt-1">
                  {formatCurrency(node.value)}
                </div>
                <div className="text-slate-400 text-xs">
                  Toplam gelirin %{percentage}&apos;i
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLOW_COLORS.income }} />
          <span>Gelir</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FLOW_COLORS.netRemaining }} />
          <span>Net Kalan</span>
        </div>
        <div className="text-xs text-slate-500">
          | Toplam Gider: {formatCurrency(data.totalExpenses)}
        </div>
      </div>
    </div>
  )
}

export default CashFlowDiagram
