const SUPPORTED_META_CHANNELS = Object.freeze(['whatsapp', 'instagram', 'messenger']);
const WEBHOOK_SOURCE_TYPE = "webhook";

const redisKeyPrefix = Object.freeze({
    COMPANY_SETTINGS: 'company_settings',
    WAP_PHONE_NUMBER_ID: 'wapPhoneNumberId',
    MSN_PAGE_ID: 'msnPageId',
    IGM_BUSINESS_ACCOUNT_ID: 'igmBusinessAccountId',
});

const rol = {
    CUSTOMER_ADMIN_ROLE: 'admin', // Rol de administrador del cliente estándar
    SYSTEM_ADMIN_ROLE: 'system', // Rol de administrador del sistema
    USER_ROLE: 'user', // Rol de usuario estandar
    VIEWER_ROLE: 'viewer',
    USER_TRACKING_ROLE: 'user_tracking',
};

const metaChannels = Object.freeze({
    WHATSAPP: 'whatsapp',
    MESSENGER: 'messenger',
    INSTAGRAM: 'instagram',
});

const headers = Object.freeze({
    COMPANY_ID: 'X-Company-Id',
    COMPANY_NAME: 'X-Company-Name',
    CONTENT_TYPE: 'Content-Type',
    INTERNAL_REQUEST: 'X-Internal-Request',
    SERVICE_CHANNEL: 'X-Service-Channel',
    SOURCE_TYPE: 'X-Source-Type',
    USER_AGENT: 'User-Agent',
    USER_ID: 'X-User-Id',
    USER_NAME: 'X-User-Name',
    USER_ROLES: 'X-User-Roles',
    CONSUMER_USERNAME: 'X-Consumer-Username'
});

module.exports = {
    headers,
    metaChannels,
    redisKeyPrefix,
    rol,
    WEBHOOK_SOURCE_TYPE,
    SUPPORTED_META_CHANNELS
}