/**
 * api.js - API调用封装 + 数据管理 + 后端同步
 * 
 * ⚠️ 本文件所有函数均从 archive/app_2026-08-27_backup_1550lines.js 完整提取
 * 未做任何逻辑修改，仅做模块化拆分
 * 
 * 来源行号：
 * - apiCall(): 行45-116
 * - _readData()/_saveData(): 行523-536
 * - syncToBackend()/syncGroupsToBackend(): 行1249-1261
 * - loadFromBackend(): 行1263-1304
 * 
 * 依赖：app.js (log, LOG_LEVELS), ui.js (showLoading/hideLoading/showToast)
 */

console.log('[API] ✅ api.js 开始加载（从备份提取）...');

(function() {
    'use strict';

    var log = window.appLog || console.log;
    var LOG_LEVELS = window.LOG_LEVELS || { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SUCCESS: 'SUCCESS' };

    // ===== 从备份提取：统一API调用封装（行45-116）=====
    function apiCall(url, options) {
        options = options || {};
        var method = options.method || 'GET';
        var body = options.body;
        var showLoad = options.loading !== false;
        var raw = options.raw === true;
        var responseType = options.responseType || 'json';
        var onError = options.onError;

        if (showLoad) window.showLoading();

        var fetchOpts = { method: method, headers: { 'Content-Type': 'application/json' } };
        if (body) fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);

        log(LOG_LEVELS.INFO, 'API', method + ' ' + url);

        return fetch(url, fetchOpts)
            .then(function(r) {
                if (showLoad) window.hideLoading();
                log(LOG_LEVELS.INFO, 'API', '响应状态: ' + r.status + ' ' + url);

                if (responseType === 'blob') {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.blob();
                }

                if (raw) return r;

                if (!r.ok) {
                    return r.json().then(function(j) {
                        var msg = j.message || j.error || '网络错误';
                        var error = new Error(msg);
                        error.status = r.status;
                        error.data = j;
                        throw error;
                    }).catch(function(e) {
                        if (e instanceof SyntaxError) {
                            var err = new Error('网络错误 (' + r.status + ')');
                            err.status = r.status;
                            throw err;
                        }
                        throw e;
                    });
                }
                return r.json();
            })
            .then(function(data) {
                if (responseType === 'blob') return data;

                if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
                    if (data.code >= 400) {
                        var err = new Error(data.message || '网络错误');
                        err.status = data.code;
                        err.data = data.data;
                        throw err;
                    }
                    return data.data;
                }
                return data;
            })
            .catch(function(e) {
                if (showLoad) window.hideLoading();
                log(LOG_LEVELS.ERROR, 'API', e.message + ' ' + url);

                if (onError && typeof onError === 'function') {
                    onError(e);
                } else {
                    if (window.showToast) window.showToast('网络错误: ' + e.message);
                }
                throw e;
            });
    }

    // ===== 从备份提取：数据读写（行523-536）=====
    var _dataCache = null;

    function _readData() {
        if (_dataCache === null) {
            try { 
                _dataCache = JSON.parse(localStorage.getItem('emailData')); 
            } catch(e) { 
                _dataCache = null; 
            }
            if (!Array.isArray(_dataCache)) _dataCache = [];
        }
        return _dataCache;
    }

    function _saveData(arr, doSync) {
        _dataCache = arr;
        try { 
            localStorage.setItem('emailData', JSON.stringify(arr)); 
        } catch(e) {
            if (window.showToast) window.showToast(window.t('storageFull') || '本地存储空间不足，数据已同步到后端', 'warning', 5000);
        }
        if (doSync !== false) syncToBackend();
    }

    // ===== 从备份提取：后端数据同步（行1249-1261）=====
    var _syncTimer = null;

    function syncToBackend() {
        clearTimeout(_syncTimer);
        _syncTimer = setTimeout(function() {
            apiCall('/api/accounts', { method: 'POST', body: _readData(), loading: false }).catch(function() {});
        }, 100);
    }

    function syncGroupsToBackend() {
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        apiCall('/api/groups', { method: 'POST', body: groups, loading: false }).catch(function() {});
    }

    // ===== 从备份提取：从后端加载数据（行1263-1304）=====
    function loadFromBackend() {
        log(LOG_LEVELS.INFO, '后端', '开始从服务器加载数据...');

        apiCall('/api/accounts', { loading: false }).then(function(serverData) {
            log(LOG_LEVELS.SUCCESS, '后端', '账号数据加载成功，共' + (serverData ? serverData.length : 0) + '条');

            if (!Array.isArray(serverData) || serverData.length === 0) return;
            
            var local = _readData();
            if (local.length === 0) {
                _saveData(serverData, false);
            } else {
                var serverMap = {};
                serverData.forEach(function(s) { serverMap[s.email] = s; });
                
                local.forEach(function(l) {
                    var s = serverMap[l.email];
                    if (s) {
                        if (s.refreshToken) l.refreshToken = s.refreshToken;
                        if (s.tokenRenewedAt) l.tokenRenewedAt = s.tokenRenewedAt;
                        if (s.daysRemaining !== undefined) l.daysRemaining = s.daysRemaining;
                        if (s.expiryClass !== undefined) l.expiryClass = s.expiryClass;
                        if (s.tokenStatus) l.tokenStatus = s.tokenStatus;
                        if (s.permissionType) l.permissionType = s.permissionType;
                        if (s.group) l.group = s.group;
                        if (s.password) l.password = s.password;
                    }
                });
                
                var localEmails = {};
                local.forEach(function(l) { localEmails[l.email] = true; });
                serverData.forEach(function(s) { if (!localEmails[s.email]) local.push(s); });
                
                _saveData(local, false);
            }
            
            if (window.loadData) window.loadData();
        }).catch(function(err) {
            log(LOG_LEVELS.WARN, '后端', '账号数据加载失败: ' + err.message);
        });

        apiCall('/api/groups', { loading: false }).then(function(data) {
            log(LOG_LEVELS.SUCCESS, '后端', '分组数据加载成功，共' + (data ? data.length : 0) + '个分组');
            
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem('emailGroups', JSON.stringify(data));
                if (window.loadGroups) window.loadGroups();
                if (window.updateGroupSelects) window.updateGroupSelects();
            }
        }).catch(function(err) {
            log(LOG_LEVELS.WARN, '后端', '分组数据加载失败: ' + err.message);
        });
    }

    // ===== 导出接口 =====
    window.apiCall = apiCall;
    window._readData = _readData;
    window._invalidateDataCache = function() { _dataCache = null; };
    window._saveData = _saveData;
    window.syncToBackend = syncToBackend;
    window.syncGroupsToBackend = syncGroupsToBackend;
    window.loadFromBackend = loadFromBackend;

    log(LOG_LEVELS.SUCCESS, 'API', '✅ api.js 加载完成（所有函数来自备份验证版）');

})();