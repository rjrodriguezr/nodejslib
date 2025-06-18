const SUPPORTED_META_CHANNELS = Object.freeze(['whatsapp', 'instagram', 'messenger']);
const WEBHOOK_SOURCE_TYPE = "webhook";

const redisKeyPrefix = Object.freeze({
    COMPANY_SETTINGS: 'company_settings',
    WAP_PHONE_NUMBER_ID: 'wapPhoneNumberId',
    MSN_PAGE_ID: 'msnPageId',
    IGM_BUSINESS_ACCOUNT_ID: 'igmBusinessAccountId',
});

const metaChannels = Object.freeze({
    WHATSAPP: 'whatsapp',
    MESSENGER: 'messenger',
    INSTAGRAM: 'instagram',
});

const headers = Object.freeze({
    COMPANY_ID: 'X-Company-Id',
    CONTENT_TYPE: 'Content-Type',
    INTERNAL_REQUEST: 'X-Internal-Request',
    SERVICE_CHANNEL: 'X-Service-Channel',
    SOURCE_TYPE: 'X-Source-Type',
    USER_AGENT: 'User-Agent',
    USER_COMPANY: 'X-User-Company',
    USER_NAME: 'X-User-Name',
    USER_ROLES: 'X-User-Roles',
});

module.exports = {
    headers,
    metaChannels,
    redisKeyPrefix,
    WEBHOOK_SOURCE_TYPE,
    SUPPORTED_META_CHANNELS
}