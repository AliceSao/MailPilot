/**
 * mail.js - 邮件查看 + Token续期/检测 + 导出
 * 依赖：app.js（_readData, _saveData, showLoading, hideLoading, showModal, showToast, syncToBackend, loadData, updateTableRow, updateStats, t, apiCall）
 */
(function () {
    'use strict';

    var mailData = [];
    var currentEmailData = null;
    var currentMailbox = 'INBOX';
    var _mailCache = {};
    var MAIL_CACHE_TTL = 5 * 60 * 60 * 1000;
    var _checkingEmails = {};

    window._mailCache = _mailCache;
    window.MAIL_CACHE_TTL = MAIL_CACHE_TTL;

    function getExpiryText(days) {
        if (days === undefined || days === null || days < 0) return window.t('unknown');
        if (days <= 0) return window.t('expired');
        if (days === 1) return window.t('tomorrowExpire');
        return days + window.t('daysLeft');
    }
    window.getExpiryText = getExpiryText;

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    window.escapeHtml = escapeHtml;

    function renewTokenForEmail(email) {
        var data = window._readData();
        var item = data.find(function(d) { return d.email === email; });
        if (!item) return;

        window.showToast(window.t('renewingToken') + ' ' + email + ' ...');

        window.apiCall('/api/renew-token', {
            method: 'POST',
            body: {
                email: item.email,
                clientId: item.clientId,
                refreshToken: item.refreshToken,
                password: item.password || ''
            }
        })
        .then(function(result) {
            if (result.success) {
                var d = window._readData();
                var idx = d.findIndex(function(x) { return x.email === email; });
                if (idx !== -1) {
                    d[idx].refreshToken = result.newRefreshToken;
                    d[idx].tokenRenewedAt = result.tokenRenewedAt;
                    if (result.daysRemaining !== undefined) d[idx].daysRemaining = result.daysRemaining;
                    if (result.expiryClass !== undefined) d[idx].expiryClass = result.expiryClass;
                    window._saveData(d, true);
                    window.loadData();
                }
                window.showToast(email + ' ' + window.t('renewSuccess') + (result.mailAccessOk ? window.t('mailAccessOk') : ''));
            } else {
                window.showModal(window.t('renewFail'), email + '<br>' + (result.error || window.t('networkError')));
            }
        })
        .catch(function(e) {
            window.showModal(window.t('renewFail'), email + '<br>' + window.t('networkError') + ': ' + e.message);
        });
    }
    window.renewTokenForEmail = renewTokenForEmail;

    function batchRenewEmails(emailList) {
        var total = emailList.length;
        var data = window._readData();
        var accounts = emailList.map(function(email) {
            var item = data.find(function(d) { return d.email === email; });
            return item || { email: email };
        }).filter(function(item) { return item.refreshToken && item.clientId; });

        if (accounts.length === 0) {
            window.showToast(window.t('noDataRefresh') || '无有效数据可续期', 'warning');
            return;
        }

        window.showToast(window.t('batchRenewStart') + ' ' + accounts.length + ' ' + window.t('accounts'));

        window.apiCall('/api/batch-renew', {
            method: 'POST',
            body: accounts,
            loading: false
        })
        .then(function(results) {
            var success = 0;
            var fail = 0;
            var d = window._readData();

            (results || []).forEach(function(result) {
                var email = result.email;
                if (result.status === 'success') {
                    var idx = d.findIndex(function(x) { return x.email === email; });
                    if (idx !== -1) {
                        if (result.newRefreshToken) d[idx].refreshToken = result.newRefreshToken;
                        if (result.tokenRenewedAt) d[idx].tokenRenewedAt = result.tokenRenewedAt;
                        if (result.daysRemaining !== undefined) d[idx].daysRemaining = result.daysRemaining;
                        if (result.expiryClass !== undefined) d[idx].expiryClass = result.expiryClass;
                        d[idx].tokenStatus = 'valid';
                        window.updateTableRow(email, d[idx]);
                    }
                    success++;
                } else {
                    fail++;
                }
            });

            window._saveData(d, true);
            window.loadData();
            window.showModal(window.t('batchRenewDone'), window.t('successCount') + ' ' + success + ', ' + window.t('failCount') + ' ' + fail + '<br><br><strong style="color:#e74c3c">' + window.t('backupReminder') + '</strong>');
        })
        .catch(function(e) {
            window.showToast(window.t('networkError') + ': ' + e.message, 'error');
        });
    }

    window.batchRenewSelected = function() {
        window.batchActionPrompt(window.t('batchRenew'), window.getSelectedEmails(), function(emails) {
            if (!confirm(window.t('batchRenewConfirm1') + emails.length + window.t('batchRenewConfirm2'))) return;
            batchRenewEmails(emails);
        });
    };

    function checkTokenStatus(item, index) {
        var data = window._readData();
        var globalIndex = data.findIndex(function(d) { return d.email === item.email; });
        if (globalIndex === -1) return;

        if (_checkingEmails[item.email]) return;
        _checkingEmails[item.email] = true;

        window.apiCall('/api/check-single', {
            method: 'POST',
            body: {
                email: item.email,
                clientId: item.clientId,
                refreshToken: item.refreshToken,
                password: item.password || ''
            },
            loading: false
        })
            .then(function(result) {
                var newData = window._readData();
                var idx = newData.findIndex(function(d) { return d.email === item.email; });
                if (idx === -1) return;

                if (result.tokenStatus === 'valid') {
                    newData[idx].tokenStatus = 'valid';
                    newData[idx].permissionType = result.permissionType || 'O2';
                } else {
                    newData[idx].tokenStatus = 'invalid';
                    newData[idx].permissionType = result.error || window.t('statusInvalid');
                }

                window._saveData(newData, true);
                window.updateTableRow(item.email, newData[idx]);
                window.updateStats();
            })
            .catch(function(error) {
                console.error('[Token检测] ❌ 检测失败:', item.email, error);

                var newData = window._readData();
                var idx = newData.findIndex(function(d) { return d.email === item.email; });
                if (idx === -1) return;

                newData[idx].tokenStatus = 'unchecked';
                newData[idx].permissionType = '';

                window._saveData(newData, true);
                window.updateTableRow(item.email, newData[idx]);
                window.updateStats();

                window.showToast(item.email + ' - 检测失败: ' + (error.message || '未知错误').substring(0, 50), 'error', 5000);
            })
            .finally(function() {
                delete _checkingEmails[item.email];
            });
    }
    window.checkTokenStatus = checkTokenStatus;

    window.checkOneEmail = function(email) {
        var data = window._readData();
        var item = data.find(function(d) { return d.email === email; });
        if (!item) return;
        if (_checkingEmails[email]) return;
        window.showToast(window.t('statusChecking') + ': ' + email);
        checkTokenStatus(item, 0);
    };

    window.batchCheckSelected = function() {
        window.batchActionPrompt(window.t('batchCheck'), window.getSelectedEmails(), function(emails) {
            var data = window._readData();
            var count = 0;
            emails.forEach(function(email, i) {
                var item = data.find(function(d) { return d.email === email; });
                if (item && !_checkingEmails[email]) {
                    setTimeout(function() { checkTokenStatus(item, 0); }, i * 300);
                    count++;
                }
            });
            window.showToast(window.t('statusChecking') + ' ' + count + ' ' + window.t('accounts'));
        });
    };

    function checkExpiryWarnings() {
        var data = window._readData();
        var warnings = [];
        data.forEach(function(item) {
            var days = item.daysRemaining;
            if (days !== undefined && days !== null && days >= 0 && days <= 10) {
                warnings.push(item.email + ' (' + days + window.t('daysLeft') + ')');
            }
        });
        if (warnings.length > 0) {
            window.showToast('\u26a0 ' + warnings.length + ' ' + window.t('expiryWarning'));
        }
    }
    window.checkExpiryWarnings = checkExpiryWarnings;

    window.viewMails = function(index) {
        var data = window._readData();
        currentEmailData = data[index];
        currentMailbox = 'INBOX';
        
        if (window.showMailView) {
            window.showMailView(true, currentEmailData.email);
        }
        
        document.querySelectorAll('.mail-view-tab').forEach(function(tab) { tab.classList.remove('active'); });
        var inboxTab = document.querySelector('.mail-view-tab[data-mailbox="INBOX"]');
        if (inboxTab) inboxTab.classList.add('active');
        
        loadMailList();
    };

    window.switchMailbox = function(mailbox) {
        currentMailbox = mailbox;
        document.querySelectorAll('.mail-view-tab').forEach(function(tab) { tab.classList.remove('active'); });
        var targetTab = document.querySelector('.mail-view-tab[data-mailbox="' + mailbox + '"]');
        if (targetTab) targetTab.classList.add('active');
        loadMailList();
    };

    window.refreshMails = function() {
        if (currentEmailData) {
            var key = currentEmailData.email;
            if (_mailCache[key]) delete _mailCache[key][currentMailbox];
        }
        loadMailList();
    };

    function loadMailList(forceRefresh) {
        if (!currentEmailData) return;
        var cacheKey = currentEmailData.email;

        if (!forceRefresh && _mailCache[cacheKey] && _mailCache[cacheKey][currentMailbox]) {
            var cached = _mailCache[cacheKey][currentMailbox];
            if (Date.now() - cached.time < MAIL_CACHE_TTL) {
                mailData = cached.data;
                renderMailListPanel(cached.data);
                return;
            }
        }

        window.showLoading();

        window.apiCall('/api/mail-all', {
            method: 'POST',
            loading: false,
            body: {
                email: currentEmailData.email,
                clientId: currentEmailData.clientId,
                refreshToken: currentEmailData.refreshToken,
                mailbox: currentMailbox,
                permissionType: currentEmailData.permissionType || '',
                password: currentEmailData.password || ''
            }
        })
            .then(function(data) {
                // 后端返回标准 {code, data, message} 格式，apiCall已自动解包data字段
                var mails = Array.isArray(data) ? data : (data && Array.isArray(data.mails) ? data.mails : []);
                mailData = mails;
                if (!_mailCache[cacheKey]) _mailCache[cacheKey] = {};
                _mailCache[cacheKey][currentMailbox] = { data: mails, time: Date.now() };
                renderMailListPanel(mails);
            })
            .catch(function(error) {
                var errorMsg = error.message || '';
                var panel = document.getElementById('mail-list-panel');
                var contentPanel = document.getElementById('mail-content-panel');
                var errorHtml = '<div class="mail-empty"><i class="fas fa-exclamation-triangle" style="color:#e74c3c;font-size:2em;"></i>';
                if (errorMsg.indexOf('401') !== -1 || error.status === 401) {
                    errorHtml += '<p>' + window.t('passwordAuth') + '</p>';
                } else {
                    errorHtml += '<p>' + window.t('loadMailFail') + '</p>';
                }
                errorHtml += '<button class="btn btn-primary" style="margin-top:12px;" onclick="window.closeMailViewModal();window.showMailView(false);">' + window.t('backToList') + '</button></div>';
                if (panel) panel.innerHTML = errorHtml;
                if (contentPanel) contentPanel.innerHTML = '<div class="mail-empty"><i class="fas fa-envelope-open-text"></i><p>' + window.t('selectMailHint') + '</p></div>';
            })
            .finally(function() {
                window.hideLoading();
            });
    }

    function renderMailListPanel(data) {
        var panel = document.getElementById('mail-list-panel');
        var contentPanel = document.getElementById('mail-content-panel');

        if (data.length === 0) {
            panel.innerHTML = '<div class="mail-empty"><i class="fas fa-inbox"></i><p>' + window.t('noMail') + '</p></div>';
            contentPanel.innerHTML = '<div class="mail-empty"><i class="fas fa-envelope-open-text"></i><p>' + window.t('selectMailHint') + '</p></div>';
            return;
        }

        panel.innerHTML = data.map(function(item, index) {
            return '<div class="mail-list-item ' + (index === 0 ? 'active' : '') + '" data-action="select-mail" data-index="' + index + '">' +
                '<div class="mail-sender">' + escapeHtml(item.send) + '</div>' +
                '<div class="mail-subject">' + escapeHtml(item.subject) + '</div>' +
                '<div class="mail-date">' + escapeHtml(item.date) + '</div>' +
                '</div>';
        }).join('');

        selectMail(0);
    }

    window.selectMail = function(index) {
        document.querySelectorAll('.mail-list-item').forEach(function(item, i) {
            item.classList.toggle('active', i === index);
        });

        var item = mailData[index];
        if (!item) return;

        var contentPanel = document.getElementById('mail-content-panel');
        contentPanel.innerHTML =
            '<div class="mail-content-header" id="mail-content-header" style="display:block;">' +
            '<h4>' + escapeHtml(item.subject) + '</h4>' +
            '<div class="mail-meta">' +
            '<span><i class="fas fa-user"></i> ' + escapeHtml(item.send) + '</span>' +
            '<span><i class="fas fa-calendar"></i> ' + escapeHtml(item.date) + '</span>' +
            '</div></div>' +
            '<div class="mail-content-body" id="mail-content-body">' +
            '<div class="mail-text" id="mail-text-content"></div>' +
            '</div>';

        var textContainer = document.getElementById('mail-text-content');
        if (item.html) {
            var iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-same-origin');
            iframe.style.cssText = 'width:100%;min-height:300px;border:none;';
            textContainer.appendChild(iframe);
            iframe.srcdoc = item.html;
            iframe.onload = function() {
                try {
                    var doc = iframe.contentDocument || iframe.contentWindow.document;
                    var h = doc.documentElement.scrollHeight;
                    if (h > 0) iframe.style.height = Math.min(h + 20, 800) + 'px';
                } catch(e) {}
            };
        } else {
            textContainer.textContent = item.text || window.t('noData');
        }

        // 移动端：选中邮件后自动显示详情按钮（通过mobile.js处理）
        if (window.showMobileMailDetailButton) {
            window.showMobileMailDetailButton();
        }
    };

    window.closeMailViewModal = function() {
        if (window.showMailView) {
            window.showMailView(false);
        }
        currentEmailData = null;
        mailData = [];
        
        // 清空邮件内容面板
        var contentHeader = document.getElementById('mail-content-header');
        var contentBody = document.getElementById('mail-content-body');
        if (contentHeader) contentHeader.style.display = 'none';
        if (contentBody) {
            contentBody.innerHTML = '<div class="mail-empty"><i class="fas fa-envelope-open-text"></i><p>选择左侧邮箱，点击"查看邮件"开始</p></div>';
        }
    };

    window.exportAll = function() {
        var data = window._readData();
        if (data.length === 0) {
            window.showModal(window.t('ok'), window.t('noDataRefresh'));
            return;
        }
        window.location.href = '/api/export';
    };

    window.exportSelected = function() {
        var selectedEmails = window.getSelectedEmails();
        if (selectedEmails.length === 0) {
            window.showModal(window.t('ok'), window.t('selectEmailFirst'));
            return;
        }
        var allData = window._readData();
        var selected = allData.filter(function(a) { return selectedEmails.includes(a.email); });

        window.apiCall('/api/export-selected', {
            method: 'POST',
            body: selected,
            responseType: 'blob'
        })
        .then(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'mailpilot_selected.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.showToast(window.t('exportSelected') + ': ' + selected.length + ' ' + window.t('items'));
        })
        .catch(function(e) {
            window.showModal(window.t('ok'), window.t('networkError') + ': ' + e.message);
        });
    };

})();