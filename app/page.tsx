import Link from 'next/link'
import { ArrowRight, Calculator, Users, TrendingUp, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Navigation */}
      <nav className="px-4 lg:px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-teal-600" />
            <span className="text-xl font-bold text-slate-900">
              Proje Gelir Dağıtım Sistemi
            </span>
          </div>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6">
            Akademik Proje
            <span className="text-teal-600"> Gelir Yönetimi</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-600 mb-8">
            Akademik projelerden gelen gelirleri kaydedin, KDV ve şirket komisyonunu otomatik hesaplayın,
            net tutarları proje temsilcilerine adil şekilde dağıtın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              Sisteme Giriş Yap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Sistem Özellikleri
          </h2>
          <p className="text-slate-600">
            Akademik proje gelirlerinizi profesyonel şekilde yönetin
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Calculator className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Otomatik Hesaplamalar
            </h3>
            <p className="text-slate-600">
              KDV ve şirket komisyonu otomatik hesaplanır, net tutarlar belirlenir
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Adil Dağıtım
            </h3>
            <p className="text-slate-600">
              Proje temsilcilerine pay yüzdelerine göre otomatik gelir dağıtımı
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Detaylı Raporlama
            </h3>
            <p className="text-slate-600">
              Proje, akademisyen ve şirket bazında kapsamlı raporlar
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Güvenli Erişim
            </h3>
            <p className="text-slate-600">
              Role dayalı erişim kontrolü ile güvenli veri yönetimi
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16 border-y border-slate-200">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-teal-600 mb-2">
                100%
              </div>
              <div className="text-slate-600">
                Otomatik Hesaplama Doğruluğu
              </div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-emerald-600 mb-2">
                18%
              </div>
              <div className="text-slate-600">
                Varsayılan KDV Oranı
              </div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">
                15%
              </div>
              <div className="text-slate-600">
                Şirket Komisyon Oranı
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Calculator className="h-6 w-6" />
              <span className="text-lg font-semibold">
                Proje Gelir Dağıtım Sistemi
              </span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2025 Tüm hakları saklıdır.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
