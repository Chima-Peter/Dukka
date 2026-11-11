import type { POINT_STATUS, Points, PointsHistory } from '@app/common';

export type PointsHistoryView = {
    id: string;
    status: POINT_STATUS;
    description: PointsHistory['description'];
    count: number;
    created_at: Date;
    updated_at: Date;
};

export type PointsBalanceView = {
    id: string;
    balance: number;
    created_at: Date;
    updated_at: Date;
};

export type PointsChangeView = {
    history: PointsHistoryView;
    points: PointsBalanceView;
};

export type PointsHistoryPageView = {
    items: PointsHistoryView[];
    next_cursor: string | null;
};

export function toPointsHistoryView(
    history: PointsHistory,
): PointsHistoryView {
    return {
        id: history.id,
        status: history.status,
        description: history.description,
        count: history.count,
        created_at: history.created_at,
        updated_at: history.updated_at,
    };
}

export function toPointsBalanceView(points: Points): PointsBalanceView {
    return {
        id: points.id,
        balance: points.balance,
        created_at: points.created_at,
        updated_at: points.updated_at,
    };
}

export function toPointsChangeView(result: {
    history: PointsHistory;
    points: Points;
}): PointsChangeView {
    return {
        history: toPointsHistoryView(result.history),
        points: toPointsBalanceView(result.points),
    };
}
