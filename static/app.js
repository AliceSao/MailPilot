/**
 * app.js - 应用核心逻辑 (cleaned version)
 * 基于 core.js 清理，移除了 guard.js 验证、白名单验证、IndexedDB 存储层、广告按钮、安全防护
 * 使用后端 API 进行数据持久化
 */
(function () {
    'use strict';

    // ===== 显示页面 =====
    document.body.style.display = '';
    document.body.style.visibility = 'visible';

    // ===== i18n 国际化 =====
    var LANG = localStorage.getItem('lang') || 'zh';
    var I18N = {
        zh: {
            title: '邮箱系统', emailMgmt: '邮箱管理', groupMgmt: '分组管理',
            quickStats: '快捷统计', groupShortcut: '分组快捷入口', quickActions: '快捷操作',
            valid: '正常', invalid: '异常', checking: '检测中', unchecked: '未检测',
            totalAccounts: '账号总数', search: '搜索邮箱地址...',
            allGroups: '全部分组', allStatus: '全部状态',
            importBtn: '导入邮箱', exportBtn: '导出备份', batchGroup: '批量分组',
            batchCopy: '批量复制', batchRenew: '批量续期', batchCheck: '批量检测', batchDelete: '批量删除', clearAll: '清空邮箱',
            checkBtn: '检测',
            colCheckbox: '', colId: 'ID', colEmail: '邮箱地址', colPassword: '密码',
            colGroup: '分组', colStatus: '令牌状态', colPermission: '权限类型',
            colExpiry: '令牌有效期', colActions: '操作',
            view: '查看', renew: '续期', delete: '删除',
            noData: '暂无数据', addGroup: '添加分组', newGroupPlaceholder: '输入新分组名称...',
            importTitle: '导入邮箱', textInput: '文本输入', fileInput: '文件导入',
            importHint: '<strong>格式说明：</strong>支持两种格式，每行一条：<br>格式1：<code>邮箱----密码----客户端ID----刷新令牌</code>（完整）<br>格式2：<code>邮箱----密码</code>（仅账密，无令牌功能）',
            cancel: '取消', confirmImport: '确认导入',
            viewMail: '查看邮件', inbox: '收件箱', junk: '垃圾箱', refresh: '刷新',
            selectMailHint: '选择一封邮件查看内容', noMail: '暂无邮件',
            copyTitle: '选择复制内容', copyEmail: '仅复制邮箱地址', copyPwd: '仅复制密码', copyBoth: '复制邮箱和密码',
            batchGroupTitle: '批量设置分组', selectGroup: '选择分组', confirm: '确认',
            ok: '确定', theme: '主题', daysLeft: '天', expired: '已过期', unknown: '未知', tomorrowExpire: '明天过期',
            password: '密码', defaultGroup: '默认分组', ungrouped: '未分组',
            timeFormat: 'zh-CN', viewBtn: '查看', renewBtn: '续期', deleteBtn: '删除',
            allGroups: '全部分组', allStatus: '全部状态',
            statusValid: '正常', statusInvalid: '异常', statusChecking: '检测中', statusUnchecked: '未检测',
            importSuccess: '成功导入', items: '条数据', emailExists: '个邮箱已存在，已跳过',
            importComplete: '导入完成', noValidData: '没有有效的导入数据！', checkFormat: '请检查格式。',
            renewingToken: '正在续期', renewSuccess: '续期成功', renewFail: '续期失败',
            mailAccessOk: '，邮件访问正常', networkError: '网络错误',
            batchRenewStart: '开始批量续期', accounts: '个邮箱...',
            batchRenewDone: '续期完成', successCount: '成功', failCount: '失败',
            backupReminder: '建议立即导出备份，保存最新令牌。',
            deleteConfirm: '确定要删除此邮箱吗？',
            batchDeleteConfirm1: '即将删除选中的', batchDeleteConfirm2: '个邮箱。\n\n⚠ 删除后不可恢复！建议先导出备份。\n\n确认删除？',
            clearConfirm: '即将清空所有邮箱数据！\n\n⚠ 此操作不可恢复！请确保已导出备份。\n\n确认清空？',
            batchRenewConfirm1: '即将对', batchRenewConfirm2: '个邮箱进行令牌续期。\n\n⚠ 续期后旧令牌将失效！\n建议先导出备份。\n\n确认续期？',
            deleteSuccess: '删除成功', deletedCount: '已删除', clearSuccess: '已清空所有数据！',
            groupExists: '分组已存在！', groupAdded: '分组添加成功！', groupDeleteConfirm1: '确定要删除分组"', groupDeleteConfirm2: '"吗？该分组下的邮箱将变为未分组。',
            batchGroupDone: '已为', batchGroupDone2: '个邮箱设置分组！',
            expiryWarning: '个邮箱令牌即将过期',
            noDataRefresh: '暂无数据可刷新！', selectEmailFirst: '请先选择邮箱！',
            inputGroupName: '输入新分组名称...', enterGroupName: '请输入分组名称！',
            editGroupPrompt: '请输入新的分组名称：', selectGroupFirst: '请选择分组！',
            inputContent: '请输入导入内容！', selectFile: '请选择文件！',
            passwordAuth: '密码验证失败，请检查密码设置。', loadMailFail: '无法加载邮件，请稍后重试。',
            clientIdSetting: '客户端ID设置', clientIdPlaceholder: '输入默认Client ID...',
            saveSetting: '保存', settingSaved: '设置已保存',
        },
        ja: {
            title: 'メールシステム', emailMgmt: 'メール管理', groupMgmt: 'グループ管理',
            quickStats: 'クイック統計', groupShortcut: 'グループ', quickActions: 'クイック操作',
            valid: '正常', invalid: '異常', checking: '検出中', unchecked: '未検出',
            totalAccounts: 'アカウント数', search: 'メールアドレス検索...',
            allGroups: '全グループ', allStatus: '全ステータス',
            importBtn: 'インポート', exportBtn: 'エクスポート', batchGroup: '一括グループ',
            batchCopy: '一括コピー', batchRenew: '一括更新', batchCheck: '一括検出', batchDelete: '一括削除', clearAll: '全削除',
            checkBtn: '検出',
            colCheckbox: '', colId: 'ID', colEmail: 'メールアドレス', colPassword: 'パスワード',
            colGroup: 'グループ', colStatus: 'トークン状態', colPermission: '権限',
            colExpiry: '有効期限', colActions: '操作',
            view: '表示', renew: '更新', delete: '削除',
            noData: 'データなし', addGroup: 'グループ追加', newGroupPlaceholder: '新しいグループ名...',
            importTitle: 'メールインポート', textInput: 'テキスト入力', fileInput: 'ファイル',
            importHint: '<strong>形式：</strong>2つの形式をサポート：<br>形式1：<code>メール----パスワード----クライアントID----リフレッシュトークン</code><br>形式2：<code>メール----パスワード</code>（アカウントのみ）',
            cancel: 'キャンセル', confirmImport: 'インポート実行',
            viewMail: 'メール閲覧', inbox: '受信トレイ', junk: '迷惑メール', refresh: '更新',
            selectMailHint: 'メールを選択して内容を表示', noMail: 'メールなし',
            copyTitle: 'コピー内容を選択', copyEmail: 'メールのみ', copyPwd: 'パスワードのみ', copyBoth: 'メール+パスワード',
            batchGroupTitle: '一括グループ設定', selectGroup: 'グループ選択', confirm: '確認',
            ok: 'OK', theme: 'テーマ', daysLeft: '日', expired: '期限切れ', unknown: '不明', tomorrowExpire: '明日期限切れ',
            password: 'パスワード', defaultGroup: 'デフォルト', ungrouped: '未分組',
            timeFormat: 'ja-JP', viewBtn: '表示', renewBtn: '更新', deleteBtn: '削除',
            allGroups: '全グループ', allStatus: '全ステータス',
            statusValid: '正常', statusInvalid: '異常', statusChecking: '検出中', statusUnchecked: '未検出',
            importSuccess: 'インポート成功', items: '件', emailExists: '件は既存のためスキップ',
            importComplete: 'インポート完了', noValidData: '有効なデータがありません！', checkFormat: '形式を確認してください。',
            renewingToken: '更新中', renewSuccess: '更新成功', renewFail: '更新失敗',
            mailAccessOk: '、メールアクセス正常', networkError: 'ネットワークエラー',
            batchRenewStart: '一括更新開始', accounts: 'アカウント...',
            batchRenewDone: '更新完了', successCount: '成功', failCount: '失敗',
            backupReminder: 'バックアップをエクスポートしてください。',
            deleteConfirm: 'このメールを削除しますか？',
            batchDeleteConfirm1: '選択した', batchDeleteConfirm2: '件を削除します。\n\n⚠ 削除後は復元できません！\n先にバックアップをエクスポートしてください。\n\n確認しますか？',
            clearConfirm: '全データを削除します！\n\n⚠ この操作は元に戻せません！\nバックアップを確認してください。\n\n確認しますか？',
            batchRenewConfirm1: '', batchRenewConfirm2: '件のトークンを更新します。\n\n⚠ 更新後、旧トークンは無効になります！\n先にバックアップしてください。\n\n確認しますか？',
            deleteSuccess: '削除完了', deletedCount: '削除済み', clearSuccess: '全データを削除しました！',
            groupExists: 'グループは既に存在します！', groupAdded: 'グループ追加完了！', groupDeleteConfirm1: 'グループ「', groupDeleteConfirm2: '」を削除しますか？所属メールは未分組になります。',
            batchGroupDone: '', batchGroupDone2: '件にグループを設定しました！',
            expiryWarning: '件のトークンが期限切れ間近',
            noDataRefresh: 'データがありません！', selectEmailFirst: 'メールを選択してください！',
            inputGroupName: '新しいグループ名...', enterGroupName: 'グループ名を入力してください！',
            editGroupPrompt: '新しいグループ名を入力：', selectGroupFirst: 'グループを選択してください！',
            inputContent: 'インポート内容を入力してください！', selectFile: 'ファイルを選択してください！',
            passwordAuth: '認証失敗。パスワードを確認してください。', loadMailFail: 'メール読込失敗。後で再試行してください。',
            clientIdSetting: 'クライアントID設定', clientIdPlaceholder: 'デフォルトClient ID入力...',
            saveSetting: '保存', settingSaved: '設定を保存しました',
        }
    };
    
    function t(key) { return (I18N[LANG] || I18N.zh)[key] || (I18N.zh)[key] || key; }
    
    function applyLanguage() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
            el.innerHTML = t(el.dataset.i18nHtml);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        // Refresh data display
        if (typeof loadData === 'function') loadData();
    }
    
    window.toggleLanguage = function() {
        LANG = LANG === 'zh' ? 'ja' : 'zh';
        localStorage.setItem('lang', LANG);
        applyLanguage();
    };

    // ===== Token Expiry Helpers =====
    var TOKEN_LIFETIME_DAYS = 90;
    
    function getDaysRemaining(tokenRenewedAt) {
        if (!tokenRenewedAt) return -1; // unknown
        var renewed = new Date(tokenRenewedAt);
        var expiry = new Date(renewed.getTime() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
        var now = new Date();
        var diff = expiry.getTime() - now.getTime();
        return Math.ceil(diff / (24 * 60 * 60 * 1000));
    }
    
    function getExpiryClass(days) {
        if (days < 0) return ''; // unknown
        if (days <= 3) return 'expiry-critical';
        if (days <= 5) return 'expiry-danger';
        if (days <= 10) return 'expiry-warning';
        if (days <= 45) return 'expiry-notice';
        return 'expiry-ok';
    }
    
    function getExpiryText(days) {
        if (days < 0) return t('unknown');
        if (days <= 0) return t('expired');
        if (days === 1) return t('tomorrowExpire');
        return days + t('daysLeft');
    }
    
    function renewTokenForEmail(email) {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var item = data.find(function(d) { return d.email === email; });
        if (!item) return;
        
        // Show loading state
        showToast(t('renewingToken') + ' ' + email + ' ...', 'info');
        
        fetch('/api/renew-token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: item.email,
                clientId: item.clientId,
                refreshToken: item.refreshToken
            })
        })
        .then(function(r) { return r.json().then(function(j) { return {status: r.status, data: j}; }); })
        .then(function(result) {
            if (result.status === 200 && result.data.success) {
                var d = JSON.parse(localStorage.getItem('emailData')) || [];
                var idx = d.findIndex(function(x) { return x.email === email; });
                if (idx !== -1) {
                    d[idx].refreshToken = result.data.newRefreshToken;
                    d[idx].tokenRenewedAt = result.data.tokenRenewedAt;
                    localStorage.setItem('emailData', JSON.stringify(d));
                    syncToBackend();
                    loadData();
                }
                showToast(email + ' ' + t('renewSuccess') + (result.data.mailAccessOk ? t('mailAccessOk') : ''), 'success');
            } else {
                showModal(t('renewFail'), email + '<br>' + (result.data.error || t('networkError')));
            }
        })
        .catch(function(e) {
            showModal(t('renewFail'), email + '<br>' + t('networkError') + ': ' + e.message);
        });
    }
    window.renewTokenForEmail = renewTokenForEmail;

    // 批量续期：逐个调用 renewTokenForEmail（已验证可用），用 XMLHttpRequest 同步风格避免 Promise 链问题
    window.batchRenewSelected = function() {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showModal(t('ok'), t('selectEmailFirst'));
            return;
        }
        var selectedEmails = Array.from(checkboxes).map(function(cb) { return cb.dataset.email; });
        if (!confirm(t('batchRenewConfirm1') + selectedEmails.length + t('batchRenewConfirm2'))) return;
        batchRenewEmails(selectedEmails);
    };

    function batchRenewEmails(emailList) {
        var total = emailList.length;
        var current = 0;
        var success = 0;
        var fail = 0;

        showToast(t('batchRenewStart') + ' ' + total + ' ' + t('accounts'));

        function doNext() {
            if (current >= total) {
                syncToBackend();
                loadData();
                showModal(t('batchRenewDone'), t('successCount') + ' ' + success + ', ' + t('failCount') + ' ' + fail + '<br><br><strong style="color:#e74c3c">' + t('backupReminder') + '</strong>');
                return;
            }

            var email = emailList[current];
            var data = JSON.parse(localStorage.getItem('emailData')) || [];
            var item = data.find(function(d) { return d.email === email; });

            if (!item || !item.refreshToken || !item.clientId) {
                fail++;
                current++;
                doNext();
                return;
            }

            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/renew-token', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = 30000;

            xhr.onload = function() {
                try {
                    if (xhr.status === 200) {
                        var j = JSON.parse(xhr.responseText);
                        if (j.success) {
                            var d = JSON.parse(localStorage.getItem('emailData')) || [];
                            var idx = d.findIndex(function(x) { return x.email === email; });
                            if (idx !== -1) {
                                d[idx].refreshToken = j.newRefreshToken;
                                d[idx].tokenRenewedAt = j.tokenRenewedAt;
                                localStorage.setItem('emailData', JSON.stringify(d));
                            }
                            success++;
                        } else { fail++; }
                    } else { fail++; }
                } catch(e) { fail++; }
                current++;
                setTimeout(doNext, 200);
            };

            xhr.onerror = function() { fail++; current++; setTimeout(doNext, 200); };
            xhr.ontimeout = function() { fail++; current++; setTimeout(doNext, 200); };

            xhr.send(JSON.stringify({ email: item.email, clientId: item.clientId, refreshToken: item.refreshToken }));
        }

        doNext();
    }

    // 单个检测
    window.checkOneEmail = function(email) {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var item = data.find(function(d) { return d.email === email; });
        if (!item) return;
        if (_checkingEmails[email]) return;
        showToast(t('statusChecking') + ': ' + email);
        checkTokenStatus(item, 0);
    };

    // 批量检测（仅选中的）
    window.batchCheckSelected = function() {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showModal(t('ok'), t('selectEmailFirst'));
            return;
        }
        var selectedEmails = Array.from(checkboxes).map(function(cb) { return cb.dataset.email; });
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var count = 0;
        selectedEmails.forEach(function(email, i) {
            var item = data.find(function(d) { return d.email === email; });
            if (item && !_checkingEmails[email]) {
                setTimeout(function() { checkTokenStatus(item, 0); }, i * 300);
                count++;
            }
        });
        showToast(t('statusChecking') + ' ' + count + ' ' + t('accounts'));
    };

    function checkExpiryWarnings() {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var warnings = [];
        data.forEach(function(item) {
            var days = getDaysRemaining(item.tokenRenewedAt);
            if (days >= 0 && days <= 10) {
                warnings.push(item.email + ' (' + days + '天后过期)');
            }
        });
        if (warnings.length > 0) {
            showToast('⚠ ' + warnings.length + ' 个邮箱令牌即将过期', 'warning');
        }
    }

    // ========================================
    //           应用逻辑
    // ========================================

    // 全局变量
    var mailData = [];
    var currentMailPage = 1;
    var mailItemsPerPage = 10;
    var currentPage = 1;
    var itemsPerPage = 10;
    var currentEmailData = null;
    var currentMailbox = 'INBOX';
    var filteredData = null;

    // 邮件缓存：{email: {INBOX: {data:[], time:timestamp}, Junk: {...}}}
    var _mailCache = {};
    var MAIL_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

    // 显示/隐藏 Loading
    function showLoading() {
        var overlay = document.getElementById('loading-overlay');
        var mailDialog = document.querySelector('#mail-view-modal .mail-view-content');
        if (mailDialog && overlay.parentNode !== mailDialog) {
            mailDialog.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }
    function hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    // 侧边栏导航
    var links = document.querySelectorAll('.sidebar ul li a');
    var contentSections = document.querySelectorAll('.content-section');
    links.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            links.forEach(function (l) { l.classList.remove('active'); });
            link.classList.add('active');
            var targetId = link.getAttribute('data-target');
            contentSections.forEach(function (section) { section.classList.remove('active'); });
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 从 localStorage 加载数据
    function loadData() {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        filteredData = null;
        renderTable(data);
        renderPagination(data.length);
        toggleNoData(data.length === 0);
        updateAccountCount(data.length);
        loadGroups();
        updateGroupSelects();
        updateStats();
        updateQuickGroups();
    }

    // 更新账号数量
    function updateAccountCount(count) {
        document.getElementById('account-count').textContent = count;
    }

    // 渲染表格
    function renderTable(data) {
        var displayData = filteredData || data;
        var emailTableBody = document.querySelector('#email-table tbody');
        emailTableBody.innerHTML = '';

        var start = (currentPage - 1) * itemsPerPage;
        var end = start + itemsPerPage;
        var pageData = displayData.slice(start, end);
        var allData = JSON.parse(localStorage.getItem('emailData')) || [];

        pageData.forEach(function (item, index) {
            var globalIndex = allData.findIndex(function (d) { return d.email === item.email; });
            var row = document.createElement('tr');

            var checkboxCell = document.createElement('td');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.email = item.email;
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);

            var tokenStatus = item.tokenStatus || '';
            var tokenStatusClass = tokenStatus === 'valid' ? 'token-valid' :
                tokenStatus === 'invalid' ? 'token-invalid' :
                tokenStatus === 'checking' ? 'token-checking' : '';
            var tokenStatusText = tokenStatus === 'valid' ? t('statusValid') :
                tokenStatus === 'invalid' ? t('statusInvalid') :
                tokenStatus === 'checking' ? t('statusChecking') : t('statusUnchecked');

            var permissionType = item.permissionType || '';

            row.innerHTML += '<td class="id-col">' + (globalIndex + 1) + '</td>' +
                '<td>' + item.email + '</td>' +
                '<td>' + item.password + '</td>' +
                '<td><span class="group-tag">' + (item.group || t('ungrouped')) + '</span></td>' +
                '<td><span class="token-status ' + tokenStatusClass + '">' + tokenStatusText + '</span></td>' +
                '<td><span class="permission-type">' + permissionType + '</span></td>' +
                '<td>' + (function() {
                    var days = getDaysRemaining(item.tokenRenewedAt);
                    var cls = getExpiryClass(days);
                    var txt = getExpiryText(days);
                    return '<span class="token-expiry ' + cls + '">' + txt + '</span>';
                })() + '</td>' +
                '<td class="actions">' +
                '<button class="view" onclick="viewMails(' + globalIndex + ')"><i class="fas fa-eye"></i> ' + t('viewBtn') + '</button>' +
                '<button onclick="renewTokenForEmail(\'' + item.email.replace(/'/g, "\\'") + '\')" style="background:linear-gradient(135deg,#27ae60,#2ecc71);color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin:0 2px;" title="' + t('renewBtn') + '"><i class="fas fa-sync-alt"></i></button>' +
                '<button onclick="checkOneEmail(\'' + item.email.replace(/'/g, "\\'") + '\')" style="background:linear-gradient(135deg,#3498db,#5dade2);color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin:0 2px;" title="' + t('checkBtn') + '"><i class="fas fa-search"></i></button>' +
                '<button class="delete" onclick="deleteEmail(' + globalIndex + ')"><i class="fas fa-trash"></i></button>' +
                '</td>';
            emailTableBody.appendChild(row);
        });

        pageData.forEach(function (item, index) {
            if (!item.tokenStatus || item.tokenStatus === 'checking') {
                checkTokenStatus(item, index);
            }
        });
    }

    // 检测令牌状态 (带去重守卫)
    var _checkingEmails = {};

    function checkTokenStatus(item, index) {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var globalIndex = data.findIndex(function (d) { return d.email === item.email; });
        if (globalIndex === -1) return;

        // 去重守卫：如果已经在检测该邮箱，跳过
        if (_checkingEmails[item.email]) return;
        _checkingEmails[item.email] = true;

        var apiUrl = '/api/mail-all?refresh_token=' + encodeURIComponent(item.refreshToken) + '&client_id=' + encodeURIComponent(item.clientId) + '&email=' + encodeURIComponent(item.email) + '&mailbox=INBOX&response_type=json&password=';

        fetch(apiUrl, { method: 'GET' })
            .then(function (response) {
                var newData = JSON.parse(localStorage.getItem('emailData')) || [];
                var idx = newData.findIndex(function (d) { return d.email === item.email; });
                if (idx === -1) return;

                if (response.ok || response.status === 500) {
                    newData[idx].tokenStatus = 'valid';
                    newData[idx].permissionType = 'O2';
                } else if (response.status === 401) {
                    newData[idx].tokenStatus = 'invalid';
                    newData[idx].permissionType = t('statusInvalid');
                } else {
                    newData[idx].tokenStatus = 'invalid';
                    newData[idx].permissionType = t('statusInvalid');
                }

                localStorage.setItem('emailData', JSON.stringify(newData));
                syncToBackend();
                updateTableRow(item.email, newData[idx]);
                updateStats();
            })
            .catch(function (error) {
                var newData = JSON.parse(localStorage.getItem('emailData')) || [];
                var idx = newData.findIndex(function (d) { return d.email === item.email; });
                if (idx === -1) return;

                newData[idx].tokenStatus = 'unchecked';
                newData[idx].permissionType = '';

                localStorage.setItem('emailData', JSON.stringify(newData));
                syncToBackend();
                updateTableRow(item.email, newData[idx]);
                updateStats();
            })
            .finally(function () {
                delete _checkingEmails[item.email];
            });
    }

    // 更新表格行
    function updateTableRow(email, itemData) {
        var rows = document.querySelectorAll('#email-table tbody tr');
        rows.forEach(function (row) {
            var emailCell = row.cells[2];
            if (emailCell && emailCell.textContent === email) {
                var tokenStatusClass = itemData.tokenStatus === 'valid' ? 'token-valid' : 'token-invalid';
                var tokenStatusText = itemData.tokenStatus === 'valid' ? t('statusValid') : t('statusInvalid');
                row.cells[5].innerHTML = '<span class="token-status ' + tokenStatusClass + '">' + tokenStatusText + '</span>';
                row.cells[6].innerHTML = '<span class="permission-type">' + itemData.permissionType + '</span>';
            }
        });
    }

    // 批量检测所有邮箱状态
    function checkAllTokenStatus() {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        if (data.length === 0) return;

        var checkedCount = 0;
        var total = data.length;

        data.forEach(function (item, index) {
            setTimeout(function () {
                checkTokenStatus(item, index);
                checkedCount++;
                if (checkedCount === total) {
                    updateStats();
                }
            }, index * 300);
        });
    }

    // 全选/全不选
    document.getElementById('select-all').addEventListener('change', function () {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]');
        var self = this;
        checkboxes.forEach(function (checkbox) {
            checkbox.checked = self.checked;
        });
    });

    // 搜索邮箱
    window.searchEmails = function () {
        var keyword = document.getElementById('search-input').value.trim().toLowerCase();
        var data = JSON.parse(localStorage.getItem('emailData')) || [];

        if (keyword) {
            filteredData = data.filter(function (item) { return item.email.toLowerCase().includes(keyword); });
        } else {
            filteredData = null;
        }

        currentPage = 1;
        renderTable(data);
        renderPagination((filteredData || data).length);
        toggleNoData((filteredData || data).length === 0);
    };

    // 按分组过滤
    window.filterByGroup = function () {
        var group = document.getElementById('filter-group').value;
        var data = JSON.parse(localStorage.getItem('emailData')) || [];

        if (group) {
            filteredData = data.filter(function (item) { return item.group === group; });
        } else {
            filteredData = null;
        }

        currentPage = 1;
        renderTable(data);
        renderPagination((filteredData || data).length);
        toggleNoData((filteredData || data).length === 0);
    };

    // 渲染分页
    function renderPagination(totalItems) {
        var pagination = document.getElementById('pagination');
        var pageJumpInput = document.getElementById('page-jump-input');
        var pageTotal = document.getElementById('page-total');
        pagination.innerHTML = '';
        var totalPages = Math.ceil(totalItems / itemsPerPage);
        var maxButtons = 5;

        if (pageJumpInput) {
            pageJumpInput.min = totalPages > 0 ? '1' : '0';
            pageJumpInput.max = totalPages > 0 ? String(totalPages) : '0';
            pageJumpInput.value = totalPages > 0 ? String(currentPage) : '';
            pageJumpInput.disabled = totalPages === 0;
        }

        if (pageTotal) {
            pageTotal.textContent = '\u5171 ' + totalPages + ' \u9875';
        }

        if (totalPages === 0) {
            return;
        }

        if (currentPage > totalPages) {
            currentPage = totalPages;
            if (pageJumpInput) {
                pageJumpInput.value = String(currentPage);
            }
        }

        var startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        var endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (currentPage > 1) {
            var prevButton = document.createElement('button');
            prevButton.textContent = '\u4e0a\u4e00\u9875';
            prevButton.onclick = function () { changePage(currentPage - 1); };
            pagination.appendChild(prevButton);
        }

        if (startPage > 1) {
            var firstButton = document.createElement('button');
            firstButton.textContent = '1';
            firstButton.onclick = function () { changePage(1); };
            pagination.appendChild(firstButton);
            if (startPage > 2) {
                var ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0 8px';
                pagination.appendChild(ellipsis);
            }
        }

        for (var i = startPage; i <= endPage; i++) {
            (function (page) {
                var button = document.createElement('button');
                button.textContent = page;
                if (page === currentPage) button.classList.add('active');
                button.onclick = function () { changePage(page); };
                pagination.appendChild(button);
            })(i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                var ellipsis2 = document.createElement('span');
                ellipsis2.textContent = '...';
                ellipsis2.style.padding = '0 8px';
                pagination.appendChild(ellipsis2);
            }
            var lastButton = document.createElement('button');
            lastButton.textContent = totalPages;
            lastButton.onclick = function () { changePage(totalPages); };
            pagination.appendChild(lastButton);
        }

        if (currentPage < totalPages) {
            var nextButton = document.createElement('button');
            nextButton.textContent = '\u4e0b\u4e00\u9875';
            nextButton.onclick = function () { changePage(currentPage + 1); };
            pagination.appendChild(nextButton);
        }
    }

    function changePage(page) {
        currentPage = page;
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        renderTable(data);
        renderPagination((filteredData || data).length);
    }

    window.changeItemsPerPage = function (value) {
        itemsPerPage = parseInt(value, 10);
        currentPage = 1;
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        renderTable(data);
        renderPagination((filteredData || data).length);
    };

    window.jumpToPage = function () {
        var input = document.getElementById('page-jump-input');
        if (!input || input.disabled) return;

        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var totalItems = (filteredData || data).length;
        var totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages === 0) {
            return;
        }

        var targetPage = parseInt(input.value, 10);
        if (isNaN(targetPage)) {
            showModal(t('ok'), t('inputContent'));
            return;
        }

        if (targetPage < 1) {
            targetPage = 1;
        } else if (targetPage > totalPages) {
            targetPage = totalPages;
        }

        input.value = String(targetPage);
        changePage(targetPage);
    };

    function toggleNoData(isEmpty) {
        document.getElementById('no-data').style.display = isEmpty ? 'block' : 'none';
        document.getElementById('email-table').style.display = isEmpty ? 'none' : 'table';
    }

    // 导入弹窗
    window.openImportModal = function () {
        document.getElementById('import-modal').style.display = 'flex';
    };

    function closeImportModal() {
        document.getElementById('import-modal').style.display = 'none';
        document.getElementById('import-text').value = '';
        document.getElementById('file-name').textContent = '';
        document.getElementById('file-input').value = '';
    }
    window.closeImportModal = closeImportModal;

    window.switchImportTab = function (tab) {
        document.querySelectorAll('.import-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.import-panel').forEach(function (p) { p.classList.remove('active'); });
        document.querySelector('.import-tab[data-tab="' + tab + '"]').classList.add('active');
        document.getElementById('import-panel-' + tab).classList.add('active');
    };

    window.handleFileSelect = function (event) {
        var file = event.target.files[0];
        if (file) {
            document.getElementById('file-name').textContent = file.name;
        }
    };

    // 导入邮箱
    window.importEmails = function () {
        var activeTab = document.querySelector('.import-tab.active').dataset.tab;
        var delimiter = '----';
        var content = '';

        if (activeTab === 'text') {
            content = document.getElementById('import-text').value;
        } else {
            var fileInput = document.getElementById('file-input');
            if (fileInput.files.length === 0) {
                showModal(t('ok'), t('selectFile'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                processImport(e.target.result, delimiter);
            };
            reader.readAsText(fileInput.files[0]);
            return;
        }

        if (!content.trim()) {
            showModal(t('ok'), t('inputContent'));
            return;
        }

        processImport(content, delimiter);
    };

    // 处理导入 (无白名单验证，直接保存)
    function processImport(content, delimiter) {
        var lines = content.split('\n').filter(function (line) { return line.trim(); });
        if (lines.length === 0) {
            showModal(t('ok'), t('noValidData'));
            return;
        }

        // 格式: 邮箱----密码----客户端ID----刷新令牌
        var pendingEmails = [];
        lines.forEach(function (line) {
            var fields = line.split(delimiter);
            if (fields.length >= 4) {
                var email = fields[0].trim().toLowerCase();
                var password = fields[1].trim();
                var clientId = fields[2].trim();
                var refreshToken = fields[3].trim();
                if (email && clientId && refreshToken) {
                    pendingEmails.push({ email: email, password: password, clientId: clientId, refreshToken: refreshToken });
                }
            } else if (fields.length >= 2) {
                // Account + password only (no token)
                var email2 = fields[0].trim().toLowerCase();
                var password2 = fields[1].trim();
                if (email2 && password2) {
                    pendingEmails.push({ email: email2, password: password2, clientId: '', refreshToken: '' });
                }
            }
        });

        if (pendingEmails.length === 0) {
            showModal(t('ok'), t('noValidData') + ' ' + t('checkFormat'));
            return;
        }

        // 直接保存到 localStorage，不进行白名单验证
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var importCount = 0;

        var existsBefore = {};
        data.forEach(function(d) { existsBefore[d.email] = true; });

        pendingEmails.forEach(function (item) {
            var exists = data.some(function (d) { return d.email === item.email; });
            if (!exists) {
                data.push({
                    email: item.email,
                    password: item.password,
                    clientId: item.clientId,
                    refreshToken: item.refreshToken,
                    group: t('ungrouped'),
                    tokenRenewedAt: ''
                });
                importCount++;
            }
        });

        localStorage.setItem('emailData', JSON.stringify(data));
        syncToBackend();
        loadData();
        closeImportModal();

        var message = t('importSuccess') + ' ' + importCount + ' ' + t('items');
        if (importCount < pendingEmails.length) {
            message += '<br><br><span style="color:#f39c12">' + (pendingEmails.length - importCount) + ' ' + t('emailExists') + '</span>';
        }
        showModal(t('importComplete'), message);

        // 导入流程：逐个 检测→续期→下一个
        if (importCount > 0) {
            var newEmails = pendingEmails.filter(function(p) { return !existsBefore[p.email]; }).map(function(a) { return a.email; });
            showToast(t('importComplete') + ' - ' + t('statusChecking') + '...');
            var procIdx = 0;
            var procSuccess = 0;
            var procFail = 0;
            
            function processNext() {
                if (procIdx >= newEmails.length) {
                    syncToBackend();
                    loadData();
                    showToast(t('importComplete') + ': ' + newEmails.length + ' ' + t('items') + ' (' + t('successCount') + ' ' + procSuccess + ')');
                    return;
                }
                var em = newEmails[procIdx];
                var d = JSON.parse(localStorage.getItem('emailData')) || [];
                var item = d.find(function(x) { return x.email === em; });
                
                if (!item || !item.clientId || !item.refreshToken) {
                    procFail++;
                    procIdx++;
                    setTimeout(processNext, 100);
                    return;
                }
                
                // Step 1: Check token via /api/mail-all
                var checkUrl = '/api/mail-all?refresh_token=' + encodeURIComponent(item.refreshToken) + '&client_id=' + encodeURIComponent(item.clientId) + '&email=' + encodeURIComponent(item.email) + '&mailbox=INBOX&response_type=json&password=';
                
                var xhr = new XMLHttpRequest();
                xhr.open('GET', checkUrl, true);
                xhr.timeout = 30000;
                xhr.onload = function() {
                    var dd = JSON.parse(localStorage.getItem('emailData')) || [];
                    var idx = dd.findIndex(function(x) { return x.email === em; });
                    if (idx !== -1) {
                        if (xhr.status === 200 || xhr.status === 500) {
                            dd[idx].tokenStatus = 'valid';
                            dd[idx].permissionType = 'O2';
                        } else {
                            dd[idx].tokenStatus = 'invalid';
                            dd[idx].permissionType = t('statusInvalid');
                        }
                        localStorage.setItem('emailData', JSON.stringify(dd));
                        updateStats();
                    }
                    
                    // Step 2: Renew token
                    if (xhr.status === 200 || xhr.status === 500) {
                        var renewXhr = new XMLHttpRequest();
                        renewXhr.open('POST', '/api/renew-token', true);
                        renewXhr.setRequestHeader('Content-Type', 'application/json');
                        renewXhr.timeout = 30000;
                        renewXhr.onload = function() {
                            try {
                                if (renewXhr.status === 200) {
                                    var j = JSON.parse(renewXhr.responseText);
                                    if (j.success) {
                                        var ddd = JSON.parse(localStorage.getItem('emailData')) || [];
                                        var ri = ddd.findIndex(function(x) { return x.email === em; });
                                        if (ri !== -1) {
                                            ddd[ri].refreshToken = j.newRefreshToken;
                                            ddd[ri].tokenRenewedAt = j.tokenRenewedAt;
                                            localStorage.setItem('emailData', JSON.stringify(ddd));
                                        }
                                        procSuccess++;
                                    } else { procFail++; }
                                } else { procFail++; }
                            } catch(e) { procFail++; }
                            procIdx++;
                            setTimeout(processNext, 200);
                        };
                        renewXhr.onerror = function() { procFail++; procIdx++; setTimeout(processNext, 200); };
                        renewXhr.ontimeout = function() { procFail++; procIdx++; setTimeout(processNext, 200); };
                        renewXhr.send(JSON.stringify({ email: item.email, clientId: item.clientId, refreshToken: item.refreshToken }));
                    } else {
                        procFail++;
                        procIdx++;
                        setTimeout(processNext, 200);
                    }
                };
                xhr.onerror = function() { procFail++; procIdx++; setTimeout(processNext, 200); };
                xhr.ontimeout = function() { procFail++; procIdx++; setTimeout(processNext, 200); };
                xhr.send();
            }
            processNext();
        }
    }

    // 删除邮箱
    window.deleteEmail = function (index) {
        if (!confirm(t('deleteConfirm'))) return;
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        data.splice(index, 1);
        localStorage.setItem('emailData', JSON.stringify(data));
        syncToBackend();
        loadData();
    };

    // 批量删除
    window.batchDelete = function () {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showModal(t('ok'), t('selectEmailFirst'));
            return;
        }

        if (!confirm(t('batchDeleteConfirm1') + ' ' + checkboxes.length + ' ' + t('batchDeleteConfirm2'))) return;

        var selectedEmails = Array.from(checkboxes).map(function (cb) { return cb.dataset.email; });
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var newData = data.filter(function (item) { return !selectedEmails.includes(item.email); });
        localStorage.setItem('emailData', JSON.stringify(newData));
        syncToBackend();
        loadData();
        showModal(t('deleteSuccess'), t('deletedCount') + ' ' + checkboxes.length);
    };

    // 查看邮件
    window.viewMails = function (index) {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        currentEmailData = data[index];
        currentMailbox = 'INBOX';
        document.getElementById('mail-view-title').textContent = t('viewMail') + ' - ' + currentEmailData.email;
        document.querySelectorAll('.mail-view-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.mail-view-tab[data-mailbox="INBOX"]').classList.add('active');
        document.getElementById('mail-view-modal').style.display = 'flex';
        loadMailList();
    };

    window.switchMailbox = function (mailbox) {
        currentMailbox = mailbox;
        document.querySelectorAll('.mail-view-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.mail-view-tab[data-mailbox="' + mailbox + '"]').classList.add('active');
        loadMailList();
    };

    window.refreshMails = function () {
        // 强制刷新：清除当前邮箱+文件夹的缓存
        if (currentEmailData) {
            var key = currentEmailData.email;
            if (_mailCache[key]) delete _mailCache[key][currentMailbox];
        }
        loadMailList();
    };

    function loadMailList(forceRefresh) {
        if (!currentEmailData) return;
        var cacheKey = currentEmailData.email;
        
        // 检查缓存
        if (!forceRefresh && _mailCache[cacheKey] && _mailCache[cacheKey][currentMailbox]) {
            var cached = _mailCache[cacheKey][currentMailbox];
            if (Date.now() - cached.time < MAIL_CACHE_TTL) {
                mailData = cached.data;
                renderMailListPanel(cached.data);
                return;
            }
        }
        
        showLoading();

        var apiUrl = '/api/mail-all?refresh_token=' + encodeURIComponent(currentEmailData.refreshToken) + '&client_id=' + encodeURIComponent(currentEmailData.clientId) + '&email=' + encodeURIComponent(currentEmailData.email) + '&mailbox=' + encodeURIComponent(currentMailbox) + '&response_type=json&password=';

        fetch(apiUrl)
            .then(function (response) {
                if (!response.ok) {
                    if (response.status === 500) {
                        return response.json().then(function (errorData) {
                            if (errorData.error === "Nothing to fetch") {
                                mailData = [];
                                renderMailListPanel([]);
                                return Promise.resolve();
                            }
                            throw new Error(t('networkError'));
                        });
                    }
                    if (response.status === 401) {
                        throw { status: 401 };
                    }
                    throw new Error(t('networkError') + ': ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (data) {
                    mailData = data;
                    // 写入缓存
                    if (!_mailCache[cacheKey]) _mailCache[cacheKey] = {};
                    _mailCache[cacheKey][currentMailbox] = { data: data, time: Date.now() };
                    renderMailListPanel(data);
                }
            })
            .catch(function (error) {
                if (error.status === 401) {
                    showModal(t('ok'), t('passwordAuth'));
                } else {
                    showModal(t('ok'), t('loadMailFail'));
                }
            })
            .finally(function () {
                hideLoading();
            });
    }

    function renderMailListPanel(data) {
        var panel = document.getElementById('mail-list-panel');
        var contentPanel = document.getElementById('mail-content-panel');

        if (data.length === 0) {
            panel.innerHTML = '<div class="mail-empty"><i class="fas fa-inbox"></i><p>' + t('noMail') + '</p></div>';
            contentPanel.innerHTML = '<div class="mail-empty"><i class="fas fa-envelope-open-text"></i><p>' + t('selectMailHint') + '</p></div>';
            return;
        }

        panel.innerHTML = data.map(function (item, index) {
            return '<div class="mail-list-item ' + (index === 0 ? 'active' : '') + '" onclick="selectMail(' + index + ')">' +
                '<div class="mail-sender">' + item.send + '</div>' +
                '<div class="mail-subject">' + item.subject + '</div>' +
                '<div class="mail-date">' + item.date + '</div>' +
                '</div>';
        }).join('');

        selectMail(0);
    }

    window.selectMail = function (index) {
        document.querySelectorAll('.mail-list-item').forEach(function (item, i) {
            item.classList.toggle('active', i === index);
        });

        var item = mailData[index];
        if (!item) return;

        var contentPanel = document.getElementById('mail-content-panel');
        contentPanel.innerHTML =
            '<div class="mail-content-header">' +
            '<h4>' + item.subject + '</h4>' +
            '<div class="mail-meta">' +
            '<span><i class="fas fa-user"></i> ' + item.send + '</span>' +
            '<span><i class="fas fa-calendar"></i> ' + item.date + '</span>' +
            '</div></div>' +
            '<div class="mail-content-body">' +
            '<div class="mail-text">' + (item.html || item.text || t('noData')) + '</div>' +
            '</div>';
    };

    window.closeMailViewModal = function () {
        document.getElementById('mail-view-modal').style.display = 'none';
        currentEmailData = null;
        mailData = [];
    };

    // 导出备份 (使用后端 API)
    window.exportBackup = function () {
        window.location.href = '/api/export';
    };

    // 批量复制
    window.openCopyModal = function () {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showModal(t('ok'), t('selectEmailFirst'));
            return;
        }
        document.getElementById('copy-modal').style.display = 'flex';
    };

    window.closeCopyModal = function () {
        document.getElementById('copy-modal').style.display = 'none';
    };

    window.batchCopy = function (type) {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        var selectedEmails = Array.from(checkboxes).map(function (cb) { return cb.dataset.email; });
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var selectedData = data.filter(function (item) { return selectedEmails.includes(item.email); });

        var content = '';
        if (type === 'email') {
            content = selectedData.map(function (item) { return item.email; }).join('\n');
        } else if (type === 'password') {
            content = selectedData.map(function (item) { return item.password; }).join('\n');
        } else {
            content = selectedData.map(function (item) { return item.email + '----' + item.password; }).join('\n');
        }

        navigator.clipboard.writeText(content).then(function () {
            window.closeCopyModal();
            showModal(t('ok'), t('batchCopy') + ' ' + selectedData.length + ' ' + t('items'));
        }).catch(function () {
            showModal(t('ok'), t('networkError'));
        });
    };

    // 分组管理
    function loadGroups() {
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [t('defaultGroup')];
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var groupList = document.getElementById('group-list');

        groupList.innerHTML = groups.map(function (group) {
            var count = data.filter(function (item) { return item.group === group; }).length;
            return '<div class="group-item">' +
                '<div class="group-info">' +
                '<div class="group-icon"><i class="fas fa-folder"></i></div>' +
                '<div><div class="group-name">' + group + '</div>' +
                '<div class="group-count">' + count + ' ' + t('accounts') + '</div></div></div>' +
                '<div class="group-actions">' +
                '<button class="edit-btn" onclick="editGroup(\'' + group + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="delete-btn" onclick="deleteGroup(\'' + group + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
    }

    window.addGroup = function () {
        var name = document.getElementById('new-group-name').value.trim();
        if (!name) {
            showModal(t('ok'), t('enterGroupName'));
            return;
        }

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [t('defaultGroup')];
        if (groups.includes(name)) {
            showModal(t('ok'), t('groupExists'));
            return;
        }

        groups.push(name);
        localStorage.setItem('emailGroups', JSON.stringify(groups));
        syncGroupsToBackend();
        document.getElementById('new-group-name').value = '';
        loadGroups();
        updateGroupSelects();
        showModal(t('ok'), t('groupAdded'));
    };

    window.editGroup = function (oldName) {
        var newName = prompt(t('editGroupPrompt'), oldName);
        if (!newName || newName === oldName) return;

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        var index = groups.indexOf(oldName);
        if (index > -1) {
            groups[index] = newName;
            localStorage.setItem('emailGroups', JSON.stringify(groups));
            syncGroupsToBackend();

            var data = JSON.parse(localStorage.getItem('emailData')) || [];
            data.forEach(function (item) {
                if (item.group === oldName) {
                    item.group = newName;
                }
            });
            localStorage.setItem('emailData', JSON.stringify(data));
            syncToBackend();

            loadGroups();
            loadData();
        }
    };

    window.deleteGroup = function (name) {
        if (!confirm(t('groupDeleteConfirm1') + name + t('groupDeleteConfirm2'))) return;

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        var index = groups.indexOf(name);
        if (index > -1) {
            groups.splice(index, 1);
            localStorage.setItem('emailGroups', JSON.stringify(groups));
            syncGroupsToBackend();

            var data = JSON.parse(localStorage.getItem('emailData')) || [];
            data.forEach(function (item) {
                if (item.group === name) {
                    item.group = t('ungrouped');
                }
            });
            localStorage.setItem('emailData', JSON.stringify(data));
            syncToBackend();

            loadGroups();
            loadData();
        }
    };

    function updateGroupSelects() {
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [t('defaultGroup')];

        var filterSelect = document.getElementById('filter-group');
        filterSelect.innerHTML = '<option value="">' + t('allGroups') + '</option>' +
            groups.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');

        var batchSelect = document.getElementById('batch-group-select');
        batchSelect.innerHTML = '<option value="">' + t('selectGroupFirst') + '</option>' +
            groups.map(function (g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');
    }

    // 批量设置分组
    window.openBatchGroupModal = function () {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            showModal(t('ok'), t('selectEmailFirst'));
            return;
        }
        document.getElementById('batch-group-modal').style.display = 'flex';
    };

    window.closeBatchGroupModal = function () {
        document.getElementById('batch-group-modal').style.display = 'none';
    };

    window.applyBatchGroup = function () {
        var group = document.getElementById('batch-group-select').value;
        if (!group) {
            showModal(t('ok'), t('selectGroupFirst'));
            return;
        }

        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        var selectedEmails = Array.from(checkboxes).map(function (cb) { return cb.dataset.email; });
        var data = JSON.parse(localStorage.getItem('emailData')) || [];

        data.forEach(function (item) {
            if (selectedEmails.includes(item.email)) {
                item.group = group;
            }
        });

        localStorage.setItem('emailData', JSON.stringify(data));
        syncToBackend();
        window.closeBatchGroupModal();
        loadData();
        showModal(t('ok'), t('batchGroupDone') + selectedEmails.length + t('batchGroupDone2'));
    };

    // 模态框
    function ensureModalProgressElements() {
        var modal = document.getElementById('modal');
        if (!modal) return null;

        var modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return null;

        var existing = modalContent.querySelector('.modal-progress');
        if (existing) {
            return {
                modalContent: modalContent,
                progress: existing,
                label: existing.querySelector('.modal-progress-label'),
                percent: existing.querySelector('.modal-progress-percent'),
                bar: existing.querySelector('.modal-progress-bar'),
                note: existing.querySelector('.modal-progress-note')
            };
        }

        var progress = document.createElement('div');
        progress.className = 'modal-progress';
        progress.innerHTML =
            '<div class="modal-progress-meta">' +
            '<span class="modal-progress-label">处理中</span>' +
            '<span class="modal-progress-percent">0%</span>' +
            '</div>' +
            '<div class="modal-progress-track"><div class="modal-progress-bar"></div></div>' +
            '<div class="modal-progress-note"></div>';

        var actionButton = modalContent.querySelector('button');
        if (actionButton) {
            modalContent.insertBefore(progress, actionButton);
        } else {
            modalContent.appendChild(progress);
        }

        return {
            modalContent: modalContent,
            progress: progress,
            label: progress.querySelector('.modal-progress-label'),
            percent: progress.querySelector('.modal-progress-percent'),
            bar: progress.querySelector('.modal-progress-bar'),
            note: progress.querySelector('.modal-progress-note')
        };
    }

    function hideModalProgress() {
        var refs = ensureModalProgressElements();
        if (!refs) return;

        refs.progress.classList.remove('active');
        refs.modalContent.classList.remove('is-progress');
        refs.bar.style.width = '0%';
        refs.percent.textContent = '0%';
        refs.note.textContent = '';
    }

    function updateModalProgress(progressOptions) {
        var refs = ensureModalProgressElements();
        if (!refs) return;

        var total = Math.max(progressOptions && progressOptions.total ? progressOptions.total : 0, 0);
        var current = Math.max(progressOptions && progressOptions.current ? progressOptions.current : 0, 0);
        var percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

        refs.progress.classList.add('active');
        refs.modalContent.classList.add('is-progress');
        refs.label.textContent = progressOptions && progressOptions.label ? progressOptions.label : t('statusChecking');
        refs.percent.textContent = percent + '%';
        refs.bar.style.width = percent + '%';
        refs.note.textContent = progressOptions && progressOptions.note ? progressOptions.note : '';
    }

    function showModal(title, message, options) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').innerHTML = message;
        if (options && options.progress) {
            updateModalProgress(options.progress);
        } else {
            hideModalProgress();
        }
        document.getElementById('modal').style.display = 'flex';
    }

    function closeModal() {
        hideModalProgress();
        document.getElementById('modal').style.display = 'none';
    }
    window.closeModal = closeModal;

    // 更新时间
    function updateTime() {
        var now = new Date();
        var timeStr = now.toLocaleString(t('timeFormat'), {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'short'
        });
        document.getElementById('current-time').textContent = timeStr;
    }

    // 更新统计
    function updateStats() {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var validCount = data.filter(function (item) { return item.tokenStatus === 'valid'; }).length;
        var invalidCount = data.filter(function (item) { return item.tokenStatus === 'invalid'; }).length;
        var checkingCount = data.filter(function (item) { return item.tokenStatus === 'checking'; }).length;
        var uncheckedCount = data.filter(function (item) { return !item.tokenStatus || item.tokenStatus === null; }).length;

        document.getElementById('valid-count').textContent = validCount;
        document.getElementById('invalid-count').textContent = invalidCount;
        document.getElementById('checking-count').textContent = checkingCount;
        document.getElementById('unchecked-count').textContent = uncheckedCount;
    }

    // 按状态筛选
    window.filterByStatus = function (status) {
        document.querySelectorAll('.sidebar ul li a').forEach(function (l) { l.classList.remove('active'); });
        document.querySelector('[data-target="emails"]').classList.add('active');
        document.querySelectorAll('.content-section').forEach(function (s) { s.classList.remove('active'); });
        document.getElementById('emails').classList.add('active');

        document.getElementById('filter-status').value = status;
        window.filterByStatusSelect();
    };

    window.filterByStatusSelect = function () {
        var status = document.getElementById('filter-status').value;
        var data = JSON.parse(localStorage.getItem('emailData')) || [];

        if (status) {
            if (status === 'unchecked') {
                filteredData = data.filter(function (item) { return !item.tokenStatus || item.tokenStatus === null; });
            } else {
                filteredData = data.filter(function (item) { return item.tokenStatus === status; });
            }
        } else {
            filteredData = null;
        }

        document.getElementById('filter-group').value = '';
        document.getElementById('search-input').value = '';

        currentPage = 1;
        renderTable(data);
        renderPagination((filteredData || data).length);
        toggleNoData((filteredData || data).length === 0);
    };

    // 分组快捷入口
    function updateQuickGroups() {
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [t('defaultGroup')];
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var container = document.getElementById('quick-groups');

        container.innerHTML = groups.slice(0, 5).map(function (group) {
            var count = data.filter(function (item) { return item.group === group; }).length;
            return '<div class="quick-group-item" onclick="quickFilterGroup(\'' + group + '\')">' +
                '<span class="group-name"><i class="fas fa-folder"></i>' + group + '</span>' +
                '<span class="group-badge">' + count + '</span></div>';
        }).join('');
    }

    window.quickFilterGroup = function (group) {
        document.querySelectorAll('.sidebar ul li a').forEach(function (l) { l.classList.remove('active'); });
        document.querySelector('[data-target="emails"]').classList.add('active');
        document.querySelectorAll('.content-section').forEach(function (s) { s.classList.remove('active'); });
        document.getElementById('emails').classList.add('active');

        document.getElementById('filter-group').value = group;
        window.filterByGroup();
    };

    // 刷新所有状态 (支持后台继续)
    window._refreshRunning = false;

    window.refreshAllStatus = function () {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        if (data.length === 0) {
            showModal(t('ok'), t('noDataRefresh'));
            return;
        }

        if (window._refreshRunning) {
            return;
        }

        window._refreshRunning = true;
        window._refreshModalVisible = true;

        var total = data.length;
        var current = 0;

        // 让 modal 点击外部只隐藏弹窗
        var modalEl = document.getElementById('modal');
        modalEl.onclick = function (e) {
            if (e.target === modalEl) {
                window._refreshModalVisible = false;
                modalEl.style.display = 'none';
            }
        };

        showCheckingProgress(0, total);

        // 串行逐个检测（跟参考站一致）
        function next() {
            if (!window._refreshRunning || current >= total) {
                window._refreshRunning = false;
                if (window._refreshModalVisible) {
                    modalEl.style.display = 'none';
                }
                modalEl.onclick = null;
                // 从后端同步最新数据（含自动续期的新 refresh_token）
                fetch('/api/accounts').then(function(r){return r.json();}).then(function(d){
                    if(Array.isArray(d)&&d.length>0){
                        // 保留本地的 tokenStatus/permissionType，但更新 refreshToken
                        var local=JSON.parse(localStorage.getItem('emailData'))||[];
                        d.forEach(function(serverItem){
                            var localItem=local.find(function(l){return l.email===serverItem.email;});
                            if(localItem&&serverItem.refreshToken){
                                localItem.refreshToken=serverItem.refreshToken;
                            }
                        });
                        localStorage.setItem('emailData',JSON.stringify(local));
                    }
                }).catch(function(){}).finally(function(){
                    loadData();
                    showToast(t('statusChecking') + ' ' + t('ok') + ' - ' + total + ' ' + t('accounts'));
                });
                return;
            }

            var freshData = JSON.parse(localStorage.getItem('emailData')) || [];
            var item = freshData[current];
            if (!item || !item.clientId || !item.refreshToken) {
                current++;
                if (window._refreshModalVisible) showCheckingProgress(current, total);
                setTimeout(next, 50);
                return;
            }

            var apiUrl = '/api/mail-all?refresh_token=' + encodeURIComponent(item.refreshToken) +
                '&client_id=' + encodeURIComponent(item.clientId) +
                '&email=' + encodeURIComponent(item.email) +
                '&mailbox=INBOX&response_type=json&password=';

            fetch(apiUrl, { method: 'GET' })
                .then(function (response) {
                    var d = JSON.parse(localStorage.getItem('emailData')) || [];
                    var idx = d.findIndex(function (x) { return x.email === item.email; });
                    if (idx !== -1) {
                        if (response.ok || response.status === 500) {
                            d[idx].tokenStatus = 'valid';
                            d[idx].permissionType = 'O2';
                        } else {
                            d[idx].tokenStatus = 'invalid';
                            d[idx].permissionType = t('statusInvalid');
                        }
                        localStorage.setItem('emailData', JSON.stringify(d));
                        syncToBackend();
                        updateTableRow(item.email, d[idx]);
                        updateStats();
                    }
                })
                .catch(function () {})
                .finally(function () {
                    current++;
                    if (window._refreshModalVisible) showCheckingProgress(current, total);
                    setTimeout(next, 100);
                });
        }

        next();
    };

    function showCheckingProgress(current, total) {
        var percent = total > 0 ? Math.round((current / total) * 100) : 0;
        var modalEl = document.getElementById('modal');
        document.getElementById('modal-title').textContent = t('statusChecking');
        document.getElementById('modal-message').innerHTML =
            '<div style="text-align:center">' +
            '<div style="font-size:32px;color:#3498db;margin-bottom:10px">' + percent + '%</div>' +
            '<div style="background:#e8f4fc;border-radius:10px;height:8px;overflow:hidden;margin-bottom:10px">' +
            '<div style="background:linear-gradient(90deg,#3498db,#5dade2);height:100%;width:' + percent + '%;transition:width 0.3s"></div></div>' +
            '<div style="color:#7f8c8d;font-size:13px">' + t('statusChecking') + ' ' + current + ' / ' + total + ' ' + t('accounts') + '</div>' +
            '</div>';
        // 隐藏"确定"按钮（检测中不需要）
        var okBtn = modalEl.querySelector('.modal-content button');
        if (okBtn) okBtn.style.display = 'none';
        if (window._refreshModalVisible) modalEl.style.display = 'flex';
    }

    function checkSingleToken(item, callback) {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        var idx = data.findIndex(function (d) { return d.email === item.email; });
        if (idx === -1) {
            callback && callback();
            return;
        }

        var apiUrl = '/api/mail-all?refresh_token=' + encodeURIComponent(item.refreshToken) + '&client_id=' + encodeURIComponent(item.clientId) + '&email=' + encodeURIComponent(item.email) + '&mailbox=INBOX&response_type=json&password=';

        fetch(apiUrl, { method: 'GET' })
            .then(function (response) {
                var newData = JSON.parse(localStorage.getItem('emailData')) || [];
                var newIdx = newData.findIndex(function (d) { return d.email === item.email; });
                if (newIdx === -1) return;

                if (response.ok || response.status === 500) {
                    newData[newIdx].tokenStatus = 'valid';
                    newData[newIdx].permissionType = 'O2';
                } else {
                    newData[newIdx].tokenStatus = 'invalid';
                    newData[newIdx].permissionType = t('statusInvalid');
                }

                localStorage.setItem('emailData', JSON.stringify(newData));
                syncToBackend();
                updateTableRow(item.email, newData[newIdx]);
                updateStats();
            })
            .catch(function (error) {
                // 网络错误：设为未检测状态而非随机
                var newData = JSON.parse(localStorage.getItem('emailData')) || [];
                var newIdx = newData.findIndex(function (d) { return d.email === item.email; });
                if (newIdx === -1) return;

                newData[newIdx].tokenStatus = null;
                newData[newIdx].permissionType = '';

                localStorage.setItem('emailData', JSON.stringify(newData));
                syncToBackend();
                updateTableRow(item.email, newData[newIdx]);
                updateStats();
            })
            .finally(function () {
                callback && callback();
            });
    }

    // 清空所有数据
    window.clearAllData = function () {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        if (data.length === 0) {
            showModal(t('ok'), t('noDataRefresh'));
            return;
        }

        if (!confirm(t('clearConfirm'))) return;

        localStorage.removeItem('emailData');
        syncToBackend();
        loadData();
        showModal(t('ok'), t('clearSuccess'));
    };

    // 主题切换
    var THEMES = ['light', 'dark-theme', 'theme-starry', 'theme-dusk'];
    var THEME_ICONS = ['fa-sun', 'fa-moon', 'fa-star', 'fa-cloud-sun'];
    
    window.cycleTheme = function() {
        var current = localStorage.getItem('themeClass') || 'light';
        var idx = THEMES.indexOf(current);
        var next = THEMES[(idx + 1) % THEMES.length];
        
        // Remove all theme classes
        THEMES.forEach(function(cls) { if (cls !== 'light') document.body.classList.remove(cls); });
        // Add new theme class
        if (next !== 'light') document.body.classList.add(next);
        
        localStorage.setItem('themeClass', next);
        var icon = document.getElementById('theme-icon');
        var iconIdx = THEMES.indexOf(next);
        icon.className = 'fas ' + THEME_ICONS[iconIdx];
    };

    function loadTheme() {
        var themeClass = localStorage.getItem('themeClass') || 'light';
        if (themeClass !== 'light') {
            document.body.classList.add(themeClass);
        }
        var idx = THEMES.indexOf(themeClass);
        if (idx >= 0) {
            document.getElementById('theme-icon').className = 'fas ' + THEME_ICONS[idx];
        }
    }

    // Toast 提示
    function showToast(message) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2ecc71;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // ========================================
    //         后端数据同步
    // ========================================

    // Sync data to backend for persistence
    function syncToBackend() {
        var data = JSON.parse(localStorage.getItem('emailData')) || [];
        fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(function (e) { console.warn('Backend sync failed:', e); });
    }

    function syncGroupsToBackend() {
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groups)
        }).catch(function (e) { console.warn('Groups sync failed:', e); });
    }

    // Load from backend on startup
    function loadFromBackend() {
        fetch('/api/accounts').then(function (r) { return r.json(); }).then(function (serverData) {
            if (!Array.isArray(serverData) || serverData.length === 0) return;
            var local = JSON.parse(localStorage.getItem('emailData')) || [];
            if (local.length === 0) {
                // No local data — use server data as-is
                localStorage.setItem('emailData', JSON.stringify(serverData));
            } else {
                // Merge: keep local tokenStatus/permissionType, but update refreshToken/tokenRenewedAt from server
                var serverMap = {};
                serverData.forEach(function(s) { serverMap[s.email] = s; });
                local.forEach(function(l) {
                    var s = serverMap[l.email];
                    if (s) {
                        if (s.refreshToken) l.refreshToken = s.refreshToken;
                        if (s.tokenRenewedAt) l.tokenRenewedAt = s.tokenRenewedAt;
                    }
                });
                localStorage.setItem('emailData', JSON.stringify(local));
            }
            loadData();
        }).catch(function () {});

        fetch('/api/groups').then(function (r) { return r.json(); }).then(function (data) {
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem('emailGroups', JSON.stringify(data));
                loadGroups();
                updateGroupSelects();
            }
        }).catch(function () {});
    }

    // ===== 初始化 =====
    (function init() {
        if (!localStorage.getItem('emailGroups')) {
            localStorage.setItem('emailGroups', JSON.stringify([t('defaultGroup')]));
        }

        loadTheme();
        loadFromBackend();
        loadData();
        updateTime();
        setInterval(updateTime, 60000);
        setTimeout(checkExpiryWarnings, 3000);
        applyLanguage();
    })();

})();
