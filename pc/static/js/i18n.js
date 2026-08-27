/**
 * i18n.js - 国际化翻译数据
 * 单独提取以方便维护和扩展语言
 */
var LANG = localStorage.getItem('lang') || 'zh';
var I18N = {
    zh: {
        title: '邮箱系统', emailMgmt: '邮箱管理', groupMgmt: '分组管理',
        quickStats: '快捷统计', groupShortcut: '分组快捷入口', quickActions: '快捷操作',
        valid: '正常', invalid: '异常', checking: '检测中', unchecked: '未检测',
        totalAccounts: '账号总数', search: '搜索邮箱地址...',
        allGroups: '全部分组', allStatus: '全部状态',
        importBtn: '导入邮箱', exportBtn: '导出备份', exportSelected: '导出选中', exportAll: '导出全部', batchGroup: '批量分组',
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
        storageFull: '本地存储空间不足，数据已同步到后端',
        noExportData: '无数据可导出',
        emptyBatchInput: '请选择至少一个邮箱',
        inputGroupName: '输入新分组名称...', enterGroupName: '请输入分组名称！',
        editGroupPrompt: '请输入新的分组名称：', selectGroupFirst: '请选择分组！',
        inputContent: '请输入导入内容！', selectFile: '请选择文件！',
        passwordAuth: '密码验证失败，请检查密码设置。', loadMailFail: '无法加载邮件，请稍后重试。', backToList: '返回列表',
        clientIdSetting: '客户端ID设置', clientIdPlaceholder: '输入默认Client ID...',
        saveSetting: '保存', settingSaved: '设置已保存',
        operateSelected: '操作选中', operateAll: '操作全部',
        tabList: '邮箱列表', tabImport: '导入导出', tabBatch: '批量操作',
    },
    ja: {
        title: 'メールシステム', emailMgmt: 'メール管理', groupMgmt: 'グループ管理',
        quickStats: 'クイック統計', groupShortcut: 'グループ', quickActions: 'クイック操作',
        valid: '正常', invalid: '異常', checking: '検出中', unchecked: '未検出',
        totalAccounts: 'アカウント数', search: 'メールアドレス検索...',
        allGroups: '全グループ', allStatus: '全ステータス',
        importBtn: 'インポート', exportBtn: 'エクスポート', exportSelected: '選択をエクスポート', exportAll: '全てエクスポート', batchGroup: '一括グループ',
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
        passwordAuth: '認証失敗。パスワードを確認してください。', loadMailFail: 'メール読込失敗。後で再試行してください。', backToList: 'リストに戻る',
        clientIdSetting: 'クライアントID設定', clientIdPlaceholder: 'デフォルトClient ID入力...',
        saveSetting: '保存', settingSaved: '設定を保存しました',
        operateSelected: '選択を操作', operateAll: '全てを操作',
        tabList: 'メール一覧', tabImport: '入出力', tabBatch: '一括操作',
    }
};

function t(key) { return (I18N[LANG] || I18N.zh)[key] || (I18N.zh)[key] || key; }

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    if (typeof window.loadData === 'function') window.loadData();
}

window.toggleLanguage = function() {
    LANG = LANG === 'zh' ? 'ja' : 'zh';
    localStorage.setItem('lang', LANG);
    applyLanguage();
};