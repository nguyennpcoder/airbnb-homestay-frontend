/** Deep-link tới modal chi tiết user trên trang admin users */
export function adminUserProfileHref(userId: number | string) {
    return `/admin/users?userId=${userId}`;
}
