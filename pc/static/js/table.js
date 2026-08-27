/**
 * table.js - 表格渲染 + 搜索筛选分页 + 统计
 * 
 * ⚠️ 本文件所有函数均从 archive/app_2026-08-27_backup_1550lines.js 完整提取
 * 未做任何逻辑修改，仅做模块化拆分
 * 
 * 来源行号：
 * - 变量声明: 行518-522
 * - loadData(): 行646-658
 * - updateAccountCount(): 行661-669
 * - renderTable(): 行671-734
 * - updateTableRow(): 行736-753
 * - bindSelectAllEvent(): 行756-784
 * - doSearch/searchEmails/filterByGroup(): 行789-828
 * - renderPagination(): 行830-913
 * - changePage/changeItemsPerPage/jumpToPage(): 行915-944
 * - toggleNoData(): 行945-954
 * 
 * 依赖：app.js (log, LOG_LEVELS), api.js (_readData), ui.js (showModal/showToast)
 */

console.log('[Table] ✅ table.js 开始加载（从备份提取）...');

(function() {
    'use strict';

    var log = window.appLog || console.log;
    var LOG_LEVELS = window.LOG_LEVELS || { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SUCCESS: 'SUCCESS' };

    // ===== 从备份提取：变量声明（行518-522）=====
    // 🔴 关键修复：必须挂载到window，因为backup是单一IIFE，拆分后跨模块需要共享
    window.currentPage = 1;
    window.itemsPerPage = 10;
    window.filteredData = null;

    // ===== 从备份提取：数据加载（行646-658）=====
    function loadData() {
        var data = window._readData();
        window.filteredData = null;
        window._filteredData = null;
        renderTable(data);
        renderPagination(data.length);
        toggleNoData(data.length === 0);
        updateAccountCount(data.length);
        
        if (window.loadGroups) window.loadGroups();
        if (window.updateGroupSelects) window.updateGroupSelects();
        if (window.updateStats) window.updateStats();
        if (window.updateQuickGroups) window.updateQuickGroups();

        log(LOG_LEVELS.SUCCESS, '数据', '✅ 数据加载完成，共' + data.length + '条');
    }
    window.loadData = loadData;

    // ===== 从备份提取：账户统计更新（行661-669）=====
    function updateAccountCount(count) {
        var accountCountEl = document.getElementById('account-count');
        if (accountCountEl) accountCountEl.textContent = count;

        var topbarCount = document.getElementById('topbar-account-count');
        if (topbarCount) topbarCount.textContent = count;

        log(LOG_LEVELS.INFO, '统计', '账户总数更新: ' + count);
    }

    // ===== 从备份提取：表格渲染（行671-734）=====
    function renderTable(data) {
        var displayData = window.filteredData || window._filteredData || data;
        var emailTableBody = document.querySelector('#email-table tbody');

        if (!emailTableBody) {
            log(LOG_LEVELS.ERROR, '表格', '❌ 找不到 #email-table tbody 元素');
            return;
        }

        log(LOG_LEVELS.INFO, '表格', '开始渲染，共' + displayData.length + '条数据');

        emailTableBody.innerHTML = '';

        var start = (window.currentPage - 1) * window.itemsPerPage;
        var end = start + window.itemsPerPage;
        var pageData = displayData.slice(start, end);
        var allData = window._readData();

        pageData.forEach(function(item) {
            var globalIndex = allData.findIndex(function(d) { return d.email === item.email; });
            var row = document.createElement('tr');

            // 复选框列
            var checkboxCell = document.createElement('td');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.email = item.email;
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);

            // Token状态样式
            var tokenStatus = item.tokenStatus || '';
            var tokenStatusClass = tokenStatus === 'valid' ? 'token-valid' :
                tokenStatus === 'invalid' ? 'token-invalid' :
                tokenStatus === 'checking' ? 'token-checking' : '';
            var tokenStatusText = tokenStatus === 'valid' ? window.t('statusValid') :
                tokenStatus === 'invalid' ? window.t('statusInvalid') :
                tokenStatus === 'checking' ? window.t('statusChecking') : window.t('statusUnchecked');

            var permissionType = item.permissionType || '';
            var expiryText = window.getExpiryText ? window.getExpiryText(item.daysRemaining) : '';
            var expiryClass = item.expiryClass || '';

            // 构建表格行
            var esc = window.escapeHtml || function(s) { return s == null ? '' : String(s); };
            row.innerHTML += '<td class="id-col">' + (globalIndex + 1) + '</td>' +
                '<td>' + esc(item.email) + '</td>' +
                '<td>' + esc(item.password) + '</td>' +
                '<td><span class="group-tag">' + esc(item.group || window.t('ungrouped')) + '</span></td>' +
                '<td><span class="token-status ' + tokenStatusClass + '">' + tokenStatusText + '</span></td>' +
                '<td><span class="permission-type">' + esc(permissionType) + '</span></td>' +
                '<td><span class="token-expiry ' + expiryClass + '">' + expiryText + '</span></td>' +
                '<td class="actions">' +
                '<button class="view" data-action="view-mails" data-index="' + globalIndex + '"><i class="fas fa-eye"></i> ' + window.t('viewBtn') + '</button>' +
                '<button class="renew" data-action="renew-token" data-email="' + esc(item.email).replace(/'/g, '&#39;') + '" title="' + window.t('renewBtn') + '"><i class="fas fa-sync-alt"></i></button>' +
                '<button class="check" data-action="check-email" data-email="' + esc(item.email).replace(/'/g, '&#39;') + '" title="' + window.t('checkBtn') + '"><i class="fas fa-search"></i></button>' +
                '<button class="delete" data-action="delete-email" data-index="' + globalIndex + '"><i class="fas fa-trash"></i></button>' +
                '</td>';

            // 行点击事件（切换复选框状态）
            row.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I' || e.target.tagName === 'INPUT') return;
                var cb = row.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = !cb.checked;
            });
            
            emailTableBody.appendChild(row);
        });

        log(LOG_LEVELS.SUCCESS, '表格', '✅ 渲染完成，当前页显示' + pageData.length + '/' + displayData.length + '条');
    }
    window.renderTable = renderTable;

    // ===== 从备份提取：更新单行数据（行736-753）=====
    function updateTableRow(email, itemData) {
        var esc = window.escapeHtml || function(s) { return s == null ? '' : String(s); };
        var rows = document.querySelectorAll('#email-table tbody tr');
        rows.forEach(function(row) {
            var emailCell = row.cells[2];
            if (emailCell && emailCell.textContent === email) {
                if (row.cells[5]) {
                    var tokenStatusClass = itemData.tokenStatus === 'valid' ? 'token-valid' : 'token-invalid';
                    var tokenStatusText = itemData.tokenStatus === 'valid' ? window.t('statusValid') : window.t('statusInvalid');
                    row.cells[5].innerHTML = '<span class="token-status ' + tokenStatusClass + '">' + tokenStatusText + '</span>';
                }
                if (row.cells[6]) {
                    row.cells[6].innerHTML = '<span class="permission-type">' + esc(itemData.permissionType) + '</span>';
                }
                if (row.cells[7]) {
                    var expiryText = window.getExpiryText ? window.getExpiryText(itemData.daysRemaining) : '';
                    var cls = itemData.expiryClass || '';
                    row.cells[7].innerHTML = '<span class="token-expiry ' + cls + '">' + expiryText + '</span>';
                }
            }
        });
    }
    window.updateTableRow = updateTableRow;

    // ===== 从备份提取：全选复选框事件绑定（行756-784）=====
    function bindSelectAllEvent() {
        var selectAllEl = document.getElementById('select-all');
        
        if (selectAllEl) {
            selectAllEl.addEventListener('change', function(e) {
                if (window.toggleSelectAll) window.toggleSelectAll(e.target.checked);
                e.stopPropagation();
            });
            log(LOG_LEVELS.INFO, '事件绑定', '✅ select-all 事件绑定成功');
        } else {
            log(LOG_LEVELS.WARN, '事件绑定', '⚠️ select-all 元素不存在（可能DOM未加载完成）');
        }
        
        // 绑定表格行的checkbox事件（用于更新选中计数）
        document.addEventListener('change', function(e) {
            if (e.target.matches('#email-table tbody input[type="checkbox"]')) {
                var checkedCount = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked').length;
                
                if (window.updateSelectedCount) window.updateSelectedCount(checkedCount);
                
                // 更新表头全选状态
                var totalCheckboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]').length;
                var selectAllCheckbox = document.getElementById('select-all');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = checkedCount === totalCheckboxes && totalCheckboxes > 0;
                    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes;
                }
            }
        });
    }
    window.bindSelectAllEvent = bindSelectAllEvent;

    // ===== 从备份提取：搜索与筛选（带防抖）（行789-828）=====
    var searchDebounceTimer = null;

    function doSearch() {
        var searchInput = document.getElementById('topbar-search') || document.getElementById('search-input');
        var keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var data = window._readData();

        if (keyword) {
            window.filteredData = data.filter(function(item) { return item.email.toLowerCase().includes(keyword); });
        } else {
            window.filteredData = null;
        }
        window._filteredData = window.filteredData;

        window.currentPage = 1;
        renderTable(data);
        renderPagination((window.filteredData || data).length);
        toggleNoData((window.filteredData || data).length === 0);

        log(LOG_LEVELS.INFO, '搜索', '关键词: "' + keyword + '", 结果: ' + (window.filteredData || data).length + '条');
    }

    window.searchEmails = function() {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(doSearch, 300);
    };

    window.filterByGroup = function() {
        var groupEl = document.getElementById('filter-group');
        if (!groupEl) return;
        
        var group = groupEl.value;
        var data = window._readData();

        if (group) {
            window.filteredData = data.filter(function(item) { return item.group === group; });
        } else {
            window.filteredData = null;
        }
        window._filteredData = window.filteredData;

        window.currentPage = 1;
        renderTable(data);
        renderPagination((window.filteredData || data).length);
        toggleNoData((window.filteredData || data).length === 0);

        log(LOG_LEVELS.INFO, '筛选', '分组: "' + group + '", 结果: ' + (window.filteredData || data).length + '条');
    };

    // ===== 从备份提取：分页渲染（行830-913）=====
    function renderPagination(totalItems) {
        var pagination = document.getElementById('pagination');
        var pageJumpInput = document.getElementById('page-jump-input');
        var pageTotal = document.getElementById('page-total');

        if (!pagination) {
            log(LOG_LEVELS.ERROR, '分页', '❌ 找不到 #pagination 元素');
            return;
        }

        log(LOG_LEVELS.INFO, '分页', '渲染分页，共' + totalItems + '条记录');

        pagination.innerHTML = '';
        var totalPages = Math.ceil(totalItems / window.itemsPerPage);
        var maxButtons = 5;

        // 更新跳转输入框和总页数显示
        if (pageJumpInput) {
            pageJumpInput.min = totalPages > 0 ? '1' : '0';
            pageJumpInput.max = totalPages > 0 ? String(totalPages) : '0';
            pageJumpInput.value = totalPages > 0 ? String(window.currentPage) : '';
            pageJumpInput.disabled = totalPages === 0;
        }

        if (pageTotal) {
            pageTotal.textContent = '共 ' + totalPages + ' 页';
        }

        if (totalPages === 0) return;

        // 校正当前页码
        if (window.currentPage > totalPages) {
            window.currentPage = totalPages;
            if (pageJumpInput) pageJumpInput.value = String(window.currentPage);
        }

        // 计算按钮范围
        var startPage = Math.max(1, window.currentPage - Math.floor(maxButtons / 2));
        var endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // 上一页按钮
        if (window.currentPage > 1) {
            var prevButton = document.createElement('button');
            prevButton.textContent = '上一页';
            prevButton.onclick = function() { changePage(window.currentPage - 1); };
            pagination.appendChild(prevButton);
        }

        // 第一页
        if (startPage > 1) {
            var firstButton = document.createElement('button');
            firstButton.textContent = '1';
            firstButton.onclick = function() { changePage(1); };
            pagination.appendChild(firstButton);
            
            if (startPage > 2) {
                var ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0 8px';
                pagination.appendChild(ellipsis);
            }
        }

        // 中间页码
        for (var i = startPage; i <= endPage; i++) {
            (function(page) {
                var button = document.createElement('button');
                button.textContent = page;
                if (page === window.currentPage) button.classList.add('active');
                button.onclick = function() { changePage(page); };
                pagination.appendChild(button);
            })(i);
        }

        // 最后一页
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                var ellipsis2 = document.createElement('span');
                ellipsis2.textContent = '...';
                ellipsis2.style.padding = '0 8px';
                pagination.appendChild(ellipsis2);
            }

            var lastButton = document.createElement('button');
            lastButton.textContent = totalPages;
            lastButton.onclick = function() { changePage(totalPages); };
            pagination.appendChild(lastButton);
        }

        // 下一页按钮
        if (window.currentPage < totalPages) {
            var nextButton = document.createElement('button');
            nextButton.textContent = '下一页';
            nextButton.onclick = function() { changePage(window.currentPage + 1); };
            pagination.appendChild(nextButton);
        }
    }
    window.renderPagination = renderPagination;

    // ===== 从备份提取：分页控制函数（行915-944）=====
    function changePage(page) {
        window.currentPage = page;
        var data = window._readData();
        renderTable(data);
        renderPagination((window.filteredData || data).length);

        log(LOG_LEVELS.INFO, '分页', '切换到第' + page + '页');
    }

    window.changeItemsPerPage = function(value) {
        window.itemsPerPage = parseInt(value, 10);
        window.currentPage = 1;
        var data = window.filteredData || window._readData();
        renderTable(data);
        renderPagination(data.length);

        log(LOG_LEVELS.INFO, '分页', '每页显示: ' + window.itemsPerPage + '条');
    };

    window.jumpToPage = function() {
        var input = document.getElementById('page-jump-input');
        if (!input || input.disabled) return;

        var data = window._readData();
        var totalItems = (window.filteredData || data).length;
        var totalPages = Math.ceil(totalItems / window.itemsPerPage);
        if (totalPages === 0) return;

        var targetPage = parseInt(input.value, 10);
        if (isNaN(targetPage)) {
            if (window.showModal) window.showModal(window.t('ok'), window.t('inputContent'));
            return;
        }

        if (targetPage < 1) targetPage = 1;
        else if (targetPage > totalPages) targetPage = totalPages;

        input.value = String(targetPage);
        changePage(targetPage);
    };

    // ===== 从备份提取：空数据显示切换（行945-954）=====
    function toggleNoData(isEmpty) {
        var noDataEl = document.getElementById('no-data');
        var emailTableEl = document.getElementById('email-table');

        if (noDataEl) noDataEl.style.display = isEmpty ? 'block' : 'none';
        if (emailTableEl) emailTableEl.style.display = isEmpty ? 'none' : 'table';

        log(LOG_LEVELS.INFO, '空数据', isEmpty ? '显示空提示' : '显示表格');
    }
    window.toggleNoData = toggleNoData;

    // ===== 导出接口 =====
    // 🔴 注意：currentPage/itemsPerPage/filteredData已在文件开头挂载到window，此处无需重复导出
    window.updateAccountCount = updateAccountCount;

    log(LOG_LEVELS.SUCCESS, 'Table', '✅ table.js 加载完成（所有函数来自备份验证版，变量已挂载到window）');

})();