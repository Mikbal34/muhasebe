-- Create notification_user_settings table for user-specific notification hiding
CREATE TABLE notification_user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Ensure one setting per user per notification
    UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_notification_user_settings_notification_id ON notification_user_settings(notification_id);
CREATE INDEX idx_notification_user_settings_user_id ON notification_user_settings(user_id);
CREATE INDEX idx_notification_user_settings_hidden ON notification_user_settings(hidden);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_notification_user_settings
    BEFORE UPDATE ON notification_user_settings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Enable RLS
ALTER TABLE notification_user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification settings" ON notification_user_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings" ON notification_user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings" ON notification_user_settings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification settings" ON notification_user_settings
    FOR DELETE USING (user_id = auth.uid());