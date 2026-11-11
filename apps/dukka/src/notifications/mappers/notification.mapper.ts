import type { Notification, NotificationType } from '@app/common';

export type NotificationView = {
    id: string;
    title: string;
    type: NotificationType;
    text: string;
    has_read: boolean;
    created_at: Date;
    read_at: Date | null;
};

export type NotificationsPageView = {
    items: NotificationView[];
    next_cursor: string | null;
};

export function toNotificationView(
    notification: Notification,
): NotificationView {
    return {
        id: notification.id,
        title: notification.title,
        type: notification.type,
        text: notification.text,
        has_read: notification.has_read,
        created_at: notification.created_at,
        read_at: notification.read_at,
    };
}
