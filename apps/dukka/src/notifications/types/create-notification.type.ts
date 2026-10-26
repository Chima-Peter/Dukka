import type { NotificationType } from '@app/common';

export type CreateNotificationInput = {
    title: string;
    type: NotificationType;
    text: string;
};
