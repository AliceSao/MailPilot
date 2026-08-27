/**
 * events.js - 事件委托 + 键盘快捷键 + 侧边栏控制
 * 
 * ⚠️ 本文件所有函数均从 archive/app_2026-08-27_backup_1550lines.js 完整提取
 * 未做任何逻辑修改，仅做模块化拆分
 * 
 * 来源行号：
 * - 键盘快捷键: 行277-306
 * - 事件委托系统: 行307-526
 * - toggleSidebar(): 行1548-1555（在IIFE外部）
 * 
 * 依赖：app.js (log, LOG_LEVELS), ui.js (showModal/showToast/cycleTheme/closeModal), table.js (filterByGroup)
 */

console.log('[Events] ✅ events.js 开始加载（从备份提取）...');

(function() {
    'use strict';

    var log = window.appLog || console.log;
    var LOG_LEVELS = window.LOG_LEVELS || { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SUCCESS: 'SUCCESS' };

    // ===== 从备份提取：键盘快捷键（行277-306）=====
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        var key = e.key.toLowerCase();
        var ctrl = e.ctrlKey || e.metaKey;

        log(LOG_LEVELS.INFO, '键盘快捷键', (ctrl ? 'Ctrl+' : '') + key);

        if (key === 'escape') {
            if (window.closeModal) window.closeModal();
            if (window.closeImportModal) window.closeImportModal();
            if (window.closeCopyModal) window.closeCopyModal();
            if (window.closeBatchGroupModal) window.closeBatchGroupModal();
            if (window.closeMailViewModal) window.closeMailViewModal();
        }

        if (ctrl && key === 'f') {
            e.preventDefault();
            var searchInput = document.getElementById('topbar-search');
            if (searchInput) searchInput.focus();
        }

        if (ctrl && key === 's') {
            e.preventDefault();
            if (window.syncToBackend) window.syncToBackend();
            if (window.showToast) window.showToast(window.t('saved'));
        }
    });

    // ===== 从备份提取：事件委托系统（行307-526）=====
    document.addEventListener('click', function(e) {
        // 快捷统计项点击筛选
        var statItem = e.target.closest('.stat-item[data-status]');
        if (statItem) {
            var status = statItem.getAttribute('data-status');
            if (status && window.filterByStatus) {
                window.filterByStatus(status);
                return;
            }
        }

        var target = e.target.closest('[data-action]');
        if (!target) return;

        var action = target.getAttribute('data-action');
        log(LOG_LEVELS.INFO, '事件委托', '触发: ' + action);

        switch (action) {
            case 'toggle-language':
                if (window.toggleLanguage) window.toggleLanguage();
                break;

            case 'cycle-theme':
                if (window.cycleTheme) window.cycleTheme();
                break;

            case 'toggle-sidebar':
                log(LOG_LEVELS.INFO, '侧边栏控制', '☰ 按钮点击（统一控制）');

                // 检测是否为移动端
                if (window.innerWidth <= 768 && window.toggleMobileSidebar) {
                    log(LOG_LEVELS.INFO, '侧边栏控制', '检测到移动端，委托给mobile.js');
                    e.preventDefault();
                    e.stopPropagation();
                    window.toggleMobileSidebar();
                    break;
                }

                // PC端：控制侧边栏折叠/展开
                var sidebarEl = document.querySelector('.main-layout .sidebar');
                var hamburgerIcon = document.getElementById('hamburger-icon');
                var mainLayout = document.querySelector('.main-layout');

                if (!sidebarEl || !mainLayout) {
                    log(LOG_LEVELS.ERROR, '侧边栏控制', '❌ DOM元素缺失');
                    if (window.showToast) window.showToast('侧边栏未加载完成', 'error', 2000);
                    break;
                }

                var isCollapsed = sidebarEl.classList.contains('collapsed');
                log(LOG_LEVELS.INFO, '侧边栏控制', '状态: ' + (isCollapsed ? '已折叠' : '已展开'));

                try {
                    if (isCollapsed) {
                        // 展开侧边栏
                        sidebarEl.classList.remove('collapsed');
                        void sidebarEl.offsetWidth;  // 触发重排
                        sidebarEl.removeAttribute('style');
                        mainLayout.style.removeProperty('grid-template-columns');

                        if (hamburgerIcon) hamburgerIcon.className = 'fas fa-bars';

                        localStorage.setItem('sidebarCollapsed', 'false');
                        if (window.showToast) window.showToast('侧边栏已展开', 'success', 1500);
                    } else {
                        // 折叠侧边栏
                        sidebarEl.classList.add('collapsed');
                        sidebarEl.style.width = '0';
                        sidebarEl.style.minWidth = '0';
                        sidebarEl.style.maxWidth = '0';
                        sidebarEl.style.padding = '0';
                        sidebarEl.style.overflow = 'hidden';
                        sidebarEl.style.borderRight = 'none';

                        mainLayout.style.gridTemplateColumns = '0 1fr';

                        if (hamburgerIcon) hamburgerIcon.className = 'fas fa-arrow-right';

                        localStorage.setItem('sidebarCollapsed', 'true');
                        if (window.showToast) window.showToast('侧边栏已折叠', 'info', 1500);
                    }
                } catch (err) {
                    log(LOG_LEVELS.ERROR, '侧边栏控制', '❌ 失败: ' + err.message);
                    if (window.showToast) window.showToast('操作失败: ' + err.message, 'error', 2000);
                }
                break;

            case 'switch-tab':
                var tabId = target.getAttribute('data-tab');
                if (tabId && window.switchTab) window.switchTab(tabId);
                break;

            case 'select-all-toggle':
                var selectAllCheckbox = document.getElementById('select-all');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = !selectAllCheckbox.checked;
                    if (window.toggleSelectAll) window.toggleSelectAll(selectAllCheckbox.checked);
                }
                break;

            case 'select-all':
                var isChecked = target.checked;
                if (window.toggleSelectAll) window.toggleSelectAll(isChecked);
                break;

            case 'filter-by-group':
                if (window.filterByGroup) window.filterByGroup(target.value);
                break;

            case 'filter-by-status':
                if (window.filterByStatusSelect) window.filterByStatusSelect(target.value);
                break;

            case 'open-import-modal':
                if (window.openImportModal) window.openImportModal();
                break;

            case 'export-all':
                if (window.exportAll) window.exportAll();
                break;

            case 'export-selected':
                if (window.exportSelected) window.exportSelected();
                break;

            case 'batch-renew-selected':
                if (window.batchRenewSelected) window.batchRenewSelected();
                break;

            case 'batch-check-selected':
                if (window.batchCheckSelected) window.batchCheckSelected();
                break;

            case 'open-batch-group-modal':
                if (window.openBatchGroupModal) window.openBatchGroupModal();
                break;

            case 'open-copy-modal':
                if (window.openCopyModal) window.openCopyModal();
                break;

            case 'batch-delete':
                if (window.batchDelete) window.batchDelete();
                break;

            case 'clear-all-data':
                if (window.clearAllData) window.clearAllData();
                break;

            case 'refresh-mails':
                if (window.refreshMails) window.refreshMails();
                break;

            case 'close-mail-view':
            case 'back-to-list':
                if (window.showMailView) window.showMailView(false);
                break;

            case 'switch-mailbox':
                var mailbox = target.getAttribute('data-mailbox');
                if (mailbox && window.switchMailbox) window.switchMailbox(mailbox);
                break;

            case 'add-group':
                if (window.addGroup) window.addGroup();
                break;

            case 'close-modal':
                if (window.closeModal) window.closeModal();
                break;

            case 'close-import-modal':
                if (window.closeImportModal) window.closeImportModal();
                break;

            case 'import-emails':
                if (window.importEmails) window.importEmails();
                break;

            case 'close-copy-modal':
                if (window.closeCopyModal) window.closeCopyModal();
                break;

            case 'close-batch-group-modal':
                if (window.closeBatchGroupModal) window.closeBatchGroupModal();
                break;

            case 'jump-to-page':
                if (window.jumpToPage) window.jumpToPage();
                break;

            // 动态生成的表格操作按钮
            case 'view-mails':
                var viewIndex = parseInt(target.getAttribute('data-index'));
                if (window.viewMails && !isNaN(viewIndex)) window.viewMails(viewIndex);
                break;

            case 'renew-token':
                var renewEmail = target.getAttribute('data-email');
                if (window.renewTokenForEmail && renewEmail) window.renewTokenForEmail(renewEmail);
                break;

            case 'check-email':
                var checkEmail = target.getAttribute('data-email');
                if (window.checkOneEmail && checkEmail) window.checkOneEmail(checkEmail);
                break;

            case 'delete-email':
                var deleteIndex = parseInt(target.getAttribute('data-index'));
                if (window.deleteEmail && !isNaN(deleteIndex)) window.deleteEmail(deleteIndex);
                break;

            // 分组管理动态按钮
            case 'edit-group':
                var editGroup = target.getAttribute('data-group');
                if (window.editGroup && editGroup) window.editGroup(editGroup);
                break;

            case 'delete-group':
                var deleteGroup = target.getAttribute('data-group');
                if (window.deleteGroup && deleteGroup) window.deleteGroup(deleteGroup);
                break;

            case 'quick-filter-group':
                var filterGroup = target.getAttribute('data-group');
                if (window.quickFilterGroup && filterGroup) window.quickFilterGroup(filterGroup);
                break;

            // 邮件列表动态项
            case 'select-mail':
                var mailIndex = parseInt(target.getAttribute('data-index'));
                if (window.selectMail && !isNaN(mailIndex)) window.selectMail(mailIndex);
                break;

            case 'switch-section':
                var sectionId = target.getAttribute('data-target');
                if (sectionId && window.switchContentSection) {
                    window.switchContentSection(sectionId);
                }
                break;

            default:
                // 内容区切换（邮箱管理/分组管理）- 通过data-target属性
                var targetSection = target.getAttribute('data-target');
                if (targetSection && window.switchContentSection) {
                    window.switchContentSection(targetSection);
                } else if (action) {
                    log(LOG_LEVELS.WARN, '事件委托', '未处理的action: ' + action);
                }
        }
    });

    log(LOG_LEVELS.SUCCESS, 'Events', '✅ events.js 加载完成（所有函数来自备份验证版）');

})();

// ===== 从备份提取：toggleSidebar（行1548-1555，必须在IIFE外部）=====
window.toggleSidebar = function() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.error('[toggleSidebar] ❌ 找不到.sidebar元素');
        return;
    }

    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));

    var icon = document.getElementById('sidebar-toggle-icon');
    if (icon) {
        icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    }

    console.log('[toggleSidebar] 状态切换:', sidebar.classList.contains('collapsed') ? '折叠' : '展开');
};