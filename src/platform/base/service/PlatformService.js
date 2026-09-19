// a service for crossing platform
/* eslint-disable no-undef */

// hack for test
if (typeof chrome === 'undefined') {
    var chrome = { extension: null };
}

// 共享通道本页面降级标记：本模块实例（当前页面）出现任意 GM 读或写异常后，
// 普通共享读写统一改走本站 localStorage，直到下一次页面加载重新尝试 GM。
// 该标记只在模块内部维护，不改变 hasUserscriptStorage 的“API 是否存在”语义。
let sharedChannelUnavailable = false;

// 私有本机写助手：降级路径与 storageSet 复用同一实现，
// 避免降级期间再回到 GM 造成“写 GM、读本地”的读写分离
function writeLocalStorageKey(key, value) {
    let val = value;
    if (typeof value !== 'string') {
        val = JSON.stringify(value);
    }
    window.localStorage.setItem(key, val);
    return true;
}

export default {
    storage: {
        get sync() {
            if (chrome && chrome.storage) {
                return chrome.storage.sync.QUOTA_BYTES ? chrome.storage.sync : chrome.storage.local;
            } else {
                return window.localStorage;
            }
        },
        local: window.localStorage
    },
    // 用户脚本存储能力检测：只有 GM_getValue/GM_setValue 同时可用时才走共享存储通道
    hasUserscriptStorage() {
        return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
    },
    /**
     * 共享通道读取。
     * 默认（allowLocalFallback=true）：有用户脚本存储时只读它；否则按 origin 降级到 localStorage。
     * allowLocalFallback=false 供「已确认显式重置」后的读取：只信共享通道，即使本页面已因
     * GM 写异常降级，也仍尝试有效共享读取；GM 能力缺失或读取抛错时返回 defaultValue，
     * 绝不回退到本站 localStorage 的旧副本。
     * @param {string} key
     * @param {*} [defaultValue]
     * @param {boolean} [allowLocalFallback]
     * @returns {*}
     */
    storageGetShared(key, defaultValue = null, allowLocalFallback = true) {
        // false 时跳过本页降级标记，仍尝试有效共享读值（GM 读正常即共享有效）
        if (this.hasUserscriptStorage() && (allowLocalFallback ? !sharedChannelUnavailable : true)) {
            try {
                const val = GM_getValue(key, defaultValue);
                return val === undefined ? defaultValue : val;
            } catch (e) {
                // GM 读取抛错：本页面标记降级，之后普通共享读写统一走 localStorage，
                // 下次页面加载再重试 GM；GM 正常返回缺失值时不降级，保持共享为空语义，
                // 避免绕过 blocked/迁移判断
                sharedChannelUnavailable = true;
            }
        }
        if (!allowLocalFallback) {
            return defaultValue;
        }
        return this.storageGetLocal(key, defaultValue);
    },
    /**
     * 共享通道写入。
     * 普通调用（requireShared=false）：GM 可用时写 GM；本页面出现任意 GM 读写异常后
     * 统一降级写当前 origin 的 localStorage，直到下次页面加载重试 GM。
     * requireShared=true 供“清空缓存并重置全部设置”的 blocked 标记使用：
     * 只要存在任意 GM 存储能力，就必须真实 GM_setValue 成功才返回 true，
     * 不允许用本地写入成功冒充共享成功；GM 能力不完整时同样返回 false；
     * 完全没有 GM 能力（TEST/无用户脚本环境）时仍允许本地写入。
     * @param {string} key
     * @param {*} value
     * @param {boolean} [requireShared]
     * @returns {boolean}
     */
    storageSetShared(key, value, requireShared = false) {
        if (requireShared) {
            const hasAnyGMStorage = typeof GM_getValue === 'function'
                || typeof GM_setValue === 'function'
                || typeof GM_listValues === 'function'
                || typeof GM_deleteValue === 'function';
            if (!hasAnyGMStorage) {
                try {
                    return writeLocalStorageKey(key, value);
                } catch (e) {
                    return false;
                }
            }
            if (typeof GM_setValue !== 'function') {
                // GM 存储能力不完整，无法满足共享持久化保证，不得以本地成功冒充
                return false;
            }
            try {
                GM_setValue(key, value);
            } catch (e) {
                // 严格写入失败：本页面普通通道一并按 GM 不可用降级，但不写本地冒充成功
                sharedChannelUnavailable = true;
                return false;
            }
            // GM 已持有真实共享值；镜像到本站 local，保证本页面降级期间的读取
            // 也能看到 blocked，不因镜像失败而掩盖 GM 写入成功
            try {
                writeLocalStorageKey(key, value);
            } catch (e) {
            }
            return true;
        }
        if (this.hasUserscriptStorage() && !sharedChannelUnavailable) {
            // 写之前先探测同 key 的 GM 读：GM 读不可用时若仍写 GM，
            // 会出现“写进 GM、读回本地旧值”的读写分离
            try {
                GM_getValue(key, null);
            } catch (e) {
                sharedChannelUnavailable = true;
            }
            if (!sharedChannelUnavailable) {
                try {
                    GM_setValue(key, value);
                    return true;
                } catch (e) {
                    // GM 写异常同样标记本页面降级，后续读写统一走本地
                    sharedChannelUnavailable = true;
                }
            }
        }
        // GM 能力缺失或本页面已降级：直接用私有本地写，
        // 不调用 storageSet，避免它再次重试 GM 造成通道不一致
        try {
            return writeLocalStorageKey(key, value);
        } catch (e) {
            return false;
        }
    },
    // 站点本地通道：始终只读当前 origin 的 localStorage
    storageGetLocal(key, defaultValue = null) {
        try {
            const val = window.localStorage.getItem(key);
            return val === null ? defaultValue : val;
        } catch (e) {
            return defaultValue;
        }
    },
    storageGet(key, defaultValue = null) {
        try {
            if (typeof GM_getValue === 'function') {
                return GM_getValue(key, defaultValue);
            }
        } catch (e) {
        }
        try {
            let val = window.localStorage.getItem(key);
            return val === null ? defaultValue : val;
        } catch (e) {
            return defaultValue;
        }
    },
    storageSet(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
                return true;
            }
        } catch (e) {
        }
        try {
            return writeLocalStorageKey(key, value);
        } catch (e) {
            return false;
        }
    },
    storageRemove(key) {
        try {
            if (typeof GM_deleteValue === 'function') {
                GM_deleteValue(key);
                return true;
            }
        } catch (e) {
        }
        try {
            window.localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    },
    // 清空存储；keyPrefix 支持字符串或字符串数组，只清 eHunter 自己的键，避免连带清掉站点自身数据
    // 跨平台影响：EH/NH/TEST 共用本方法，这里只扩展参数形式，传单个字符串时行为与之前一致
    /**
     * @param {string | string[]} [keyPrefix] 单个前缀或前缀数组；空字符串表示清空全部
     * @returns {boolean}
     */
    storageClear(keyPrefix = '') {
        const clearAll = !Array.isArray(keyPrefix) && keyPrefix === '';
        const prefixes = (Array.isArray(keyPrefix) ? keyPrefix : [keyPrefix]).filter(prefix => typeof prefix === 'string' && prefix !== '');
        const matchesPrefix = (key) => {
            if (clearAll) {
                return true;
            }
            const name = typeof key === 'string' ? key : String(key);
            return prefixes.some(prefix => name.indexOf(prefix) === 0);
        };
        // GM 通道：只有列举与删除能力都可用、且每个匹配键都删除成功才算清理完成；
        // 能力缺失、列举抛错/返回非数组、删除抛错都按失败上报，避免 GM 键仍在时误报成功
        let gmCleared = true;
        const hasGMStorage = typeof GM_getValue === 'function'
            || typeof GM_setValue === 'function'
            || typeof GM_listValues === 'function'
            || typeof GM_deleteValue === 'function';
        if (hasGMStorage) {
            gmCleared = false;
            if (typeof GM_listValues === 'function' && typeof GM_deleteValue === 'function') {
                try {
                    const keys = GM_listValues();
                    if (Array.isArray(keys)) {
                        gmCleared = true;
                        keys.forEach(key => {
                            try {
                                if (matchesPrefix(key)) {
                                    GM_deleteValue(key);
                                }
                            } catch (e) {
                                gmCleared = false;
                            }
                        });
                    }
                } catch (e) {
                }
            }
        }
        // 本地通道始终尝试清理：GM 失败不影响本站清理，反之亦然
        let localCleared = true;
        try {
            const localKeys = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key !== null && matchesPrefix(key)) {
                    localKeys.push(key);
                }
            }
            localKeys.forEach(key => window.localStorage.removeItem(key));
        } catch (e) {
            localCleared = false;
        }
        return gmCleared && localCleared;
    },
    getExtension() {
        return chrome.extension;
    },
    fetch(url, option) {
        /* eslint-disable camelcase */
        if (typeof GM_info !== 'undefined' && GM_info.version) { // the ENV is Tampermonkey
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: option.method,
                    url,
                    onload: x => {
                        let responseText = x.responseText;
                        x.text = async function() {
                            return responseText;
                        }
                        resolve(x);
                    },
                    onerror: e => {
                        reject(`GM_xhr error, ${e.status}`);
                    }
                });
            });
        } else { // the ENV is Chrome or Firefox
            return window.fetch(url, option);
        }
    }
};
