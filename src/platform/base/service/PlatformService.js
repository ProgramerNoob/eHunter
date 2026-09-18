// a service for crossing platform
/* eslint-disable no-undef */

// hack for test
if (typeof chrome === 'undefined') {
    var chrome = { extension: null };
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
    // 共享通道：有用户脚本存储时只读它；否则按 origin 降级到 localStorage
    storageGetShared(key, defaultValue = null) {
        if (this.hasUserscriptStorage()) {
            try {
                const val = GM_getValue(key, defaultValue);
                return val === undefined ? defaultValue : val;
            } catch (e) {
                return defaultValue;
            }
        }
        return this.storageGetLocal(key, defaultValue);
    },
    // 共享通道写入：GM 写失败时降级到当前 origin 的 localStorage
    storageSetShared(key, value) {
        if (this.hasUserscriptStorage()) {
            try {
                GM_setValue(key, value);
                return true;
            } catch (e) {
            }
        }
        return this.storageSet(key, value);
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
            let val = value;
            if (typeof value !== 'string') {
                val = JSON.stringify(value);
            }
            window.localStorage.setItem(key, val);
            return true;
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
    // 清空存储；传入 keyPrefix 时只清 eHunter 自己的键，避免连带清掉站点自身数据
    storageClear(keyPrefix = '') {
        const matchesPrefix = (key) => {
            const name = typeof key === 'string' ? key : String(key);
            return keyPrefix === '' || name.indexOf(keyPrefix) === 0;
        };
        try {
            if (typeof GM_listValues === 'function' && typeof GM_deleteValue === 'function') {
                const keys = GM_listValues();
                if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (!matchesPrefix(key)) {
                            return;
                        }
                        try {
                            GM_deleteValue(key);
                        } catch (e) {
                        }
                    });
                }
            }
        } catch (e) {
        }
        try {
            const localKeys = [];
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key !== null && matchesPrefix(key)) {
                    localKeys.push(key);
                }
            }
            localKeys.forEach(key => window.localStorage.removeItem(key));
            return true;
        } catch (e) {
            return false;
        }
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
