/**
 * batch.js - 批量操作 + 分组管理 + 导入 + 刷新所有 + 清空
 * 依赖：api.js（_readData, _saveData, apiCall, syncToBackend, syncGroupsToBackend）
 * 依赖：ui.js（showModal, showToast, showLoading, hideLoading, updateTableRow, updateStats, loadData, t）
 * 依赖：table.js（renderTable, renderPagination, toggleNoData）
 * 依赖：mail.js（checkTokenStatus）
 */
(function () {
    'use strict';

    function batchActionPrompt(actionName, selectedEmails, callback) {
        var allData = window._readData();
        var totalCount = allData.length;
        var selectedCount = selectedEmails.length;

        if (selectedCount === 0 && totalCount === 0) {
            window.showModal(window.t('ok'), window.t('noDataRefresh'));
            return;
        }

        var overlay = document.createElement('div');
        overlay.className = 'batch-overlay';

        var box = document.createElement('div');
        box.className = 'batch-box';
        box.innerHTML = '<h3>' + actionName + '</h3>' +
            '<div class="btn-col">' +
            (selectedCount > 0 ? '<button id="ba-selected" class="btn-check">' + actionName + ' ' + window.t('operateSelected') + ' (' + selectedCount + ')</button>' : '') +
            '<button id="ba-all" class="btn-warning">' + actionName + ' ' + window.t('operateAll') + ' (' + totalCount + ')</button>' +
            '<button id="ba-cancel" class="btn-cancel">' + window.t('cancel') + '</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) { document.body.removeChild(overlay); }
        });

        if (selectedCount > 0) {
            box.querySelector('#ba-selected').addEventListener('click', function() {
                document.body.removeChild(overlay);
                callback(selectedEmails);
            });
        }
        box.querySelector('#ba-all').addEventListener('click', function() {
            document.body.removeChild(overlay);
            var all = allData.map(function(a) { return a.email; });
            callback(all);
        });
        box.querySelector('#ba-cancel').addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
    }
    window.batchActionPrompt = batchActionPrompt;

    function getSelectedEmails() {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(function(cb) { return cb.dataset.email; });
    }
    window.getSelectedEmails = getSelectedEmails;

    window.deleteEmail = function(index) {
        if (!confirm(window.t('deleteConfirm'))) return;
        var data = window._readData();
        data.splice(index, 1);
        window._saveData(data, true);
        window.loadData();
    };

    window.batchDelete = function() {
        batchActionPrompt(window.t('batchDelete'), getSelectedEmails(), function(emails) {
            if (!confirm(window.t('batchDeleteConfirm1') + emails.length + window.t('batchDeleteConfirm2'))) return;
            var data = window._readData();
            var accountsToDelete = data.filter(function(item) { return emails.includes(item.email); });

            window.apiCall('/api/batch-delete', {
                method: 'POST',
                body: accountsToDelete,
                loading: false
            })
            .then(function(results) {
                var deletedCount = (results || []).filter(function(r) { return r.status === 'deleted'; }).length;
                var newData = data.filter(function(item) { return !emails.includes(item.email); });
                window._saveData(newData, false);
                window.loadData();
                window.showModal(window.t('deleteSuccess'), window.t('deletedCount') + ' ' + deletedCount);
            })
            .catch(function(e) {
                var newData = data.filter(function(item) { return !emails.includes(item.email); });
                window._saveData(newData, true);
                window.loadData();
                window.showToast(window.t('networkError') + ': ' + e.message, 'error');
            });
        });
    };

    window.openCopyModal = function() {
        batchActionPrompt(window.t('batchCopy'), getSelectedEmails(), function(emails) {
            window._copyEmails = emails;
            document.getElementById('copy-modal').style.display = 'flex';
        });
    };

    window.closeCopyModal = function() {
        document.getElementById('copy-modal').style.display = 'none';
    };

    window.batchCopy = function(type) {
        var selectedEmails = window._copyEmails || [];
        var data = window._readData();
        var selectedData = data.filter(function(item) { return selectedEmails.includes(item.email); });

        var content = '';
        if (type === 'email') {
            content = selectedData.map(function(item) { return item.email; }).join('\n');
        } else if (type === 'password') {
            content = selectedData.map(function(item) { return item.password; }).join('\n');
        } else {
            content = selectedData.map(function(item) { return item.email + '----' + item.password; }).join('\n');
        }

        navigator.clipboard.writeText(content).then(function() {
            window.closeCopyModal();
            window.showModal(window.t('ok'), window.t('batchCopy') + ' ' + selectedData.length + ' ' + window.t('items'));
        }).catch(function() {
            window.showModal(window.t('ok'), window.t('networkError'));
        });
    };

    window.openImportModal = function() {
        document.getElementById('import-modal').style.display = 'flex';
    };

    function closeImportModal() {
        document.getElementById('import-modal').style.display = 'none';
        document.getElementById('import-text').value = '';
        document.getElementById('file-name').textContent = '';
        document.getElementById('file-input').value = '';
    }
    window.closeImportModal = closeImportModal;

    window.switchImportTab = function(tab) {
        document.querySelectorAll('.import-tab').forEach(function(tabEl) { tabEl.classList.remove('active'); });
        document.querySelectorAll('.import-panel').forEach(function(p) { p.classList.remove('active'); });
        document.querySelector('.import-tab[data-tab="' + tab + '"]').classList.add('active');
        document.getElementById('import-panel-' + tab).classList.add('active');
    };

    window.handleFileSelect = function(event) {
        var file = event.target.files[0];
        if (file) {
            document.getElementById('file-name').textContent = file.name;
        }
    };

    window.importEmails = function() {
        var activeTab = document.querySelector('.import-tab.active').dataset.tab;
        var delimiter = '----';
        var content = '';

        if (activeTab === 'text') {
            content = document.getElementById('import-text').value;
        } else {
            var fileInput = document.getElementById('file-input');
            if (fileInput.files.length === 0) {
                window.showModal(window.t('ok'), window.t('selectFile'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                processImport(e.target.result, delimiter);
            };
            reader.readAsText(fileInput.files[0]);
            return;
        }

        if (!content.trim()) {
            window.showModal(window.t('ok'), window.t('inputContent'));
            return;
        }

        processImport(content, delimiter);
    };

    function parseCsvLine(line) {
        var result = [];
        var current = '';
        var inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current.trim());
        return result;
    }

    function processImport(content, delimiter) {
        var lines = content.split('\n').filter(function(line) { return line.trim(); });
        if (lines.length === 0) {
            window.showModal(window.t('ok'), window.t('noValidData'));
            return;
        }

        var firstLine = lines[0].trim().toLowerCase();
        var isCSV = firstLine.indexOf('email,pa') !== -1 || firstLine.indexOf('email,password') !== -1;
        if (isCSV) {
            delimiter = ',';
            lines = lines.slice(1);
        }

        var pendingEmails = [];
        lines.forEach(function(line) {
            var fields;
            if (isCSV) {
                fields = parseCsvLine(line);
                var email = (fields[0] || '').trim().toLowerCase();
                var password = (fields[1] || '').trim();
                var clientId = (fields[2] || '').trim();
                var refreshToken = (fields[3] || '').trim();
                var group = (fields[4] || '').trim();
                var tokenStatus = (fields[5] || '').trim();
                var permissionType = (fields[6] || '').trim();
                var tokenRenewedAt = (fields[7] || '').trim();
                if (email && password) {
                    pendingEmails.push({
                        email: email, password: password,
                        clientId: clientId, refreshToken: refreshToken,
                        group: group || window.t('ungrouped'),
                        tokenStatus: tokenStatus, permissionType: permissionType,
                        tokenRenewedAt: tokenRenewedAt
                    });
                }
            } else {
                fields = line.split(delimiter);
                if (fields.length >= 4) {
                    var email2 = fields[0].trim().toLowerCase();
                    var password2 = fields[1].trim();
                    var clientId2 = fields[2].trim();
                    var refreshToken2 = fields[3].trim();
                    if (email2 && clientId2 && refreshToken2) {
                        pendingEmails.push({ email: email2, password: password2, clientId: clientId2, refreshToken: refreshToken2 });
                    }
                } else if (fields.length >= 2) {
                    var email3 = fields[0].trim().toLowerCase();
                    var password3 = fields[1].trim();
                    if (email3 && password3) {
                        pendingEmails.push({ email: email3, password: password3, clientId: '', refreshToken: '' });
                    }
                }
            }
        });

        if (pendingEmails.length === 0) {
            window.showModal(window.t('ok'), window.t('noValidData') + ' ' + window.t('checkFormat'));
            return;
        }

        var data = window._readData();
        var importCount = 0;

        var existsBefore = {};
        data.forEach(function(d) { existsBefore[d.email] = true; });

        pendingEmails.forEach(function(item) {
            var exists = data.some(function(d) { return d.email === item.email; });
            if (!exists) {
                data.push({
                    email: item.email,
                    password: item.password,
                    clientId: item.clientId || '',
                    refreshToken: item.refreshToken || '',
                    group: item.group || window.t('ungrouped'),
                    tokenStatus: item.tokenStatus || '',
                    permissionType: item.permissionType || '',
                    tokenRenewedAt: item.tokenRenewedAt || ''
                });
                importCount++;
            }
        });

        window._saveData(data);
        window.loadData();
        closeImportModal();

        var message = window.t('importSuccess') + ' ' + importCount + ' ' + window.t('items');
        if (importCount < pendingEmails.length) {
            message += '<br><br><span style="color:#f39c12">' + (pendingEmails.length - importCount) + ' ' + window.t('emailExists') + '</span>';
        }
        window.showModal(window.t('importComplete'), message);

        if (importCount > 0) {
            var newEmails = pendingEmails.filter(function(p) { return !existsBefore[p.email]; }).map(function(a) { return a.email; });
            window.showToast(window.t('statusChecking') + '...');
            var checkIdx = 0;
            var validCount = 0;

            function checkNext() {
                if (checkIdx >= newEmails.length) {
                    window._saveData(window._readData(), true);
                    window.loadData();
                    window.showModal(window.t('importComplete'),
                        window.t('importSuccess') + ' ' + importCount + ' ' + window.t('items') +
                        '<br>' + window.t('statusValid') + ': ' + validCount +
                        '<br><br><strong style="color:#e67e22">' + window.t('backupReminder').replace(window.t('exportBtn'), window.t('batchRenew')) + '</strong>');
                    return;
                }
                var em = newEmails[checkIdx];
                var d = window._readData();
                var item = d.find(function(x) { return x.email === em; });

                if (!item || !item.clientId || !item.refreshToken) {
                    checkIdx++;
                    setTimeout(checkNext, 50);
                    return;
                }

                window.apiCall('/api/check-single', {
                    method: 'POST',
                    body: { email: item.email, clientId: item.clientId, refreshToken: item.refreshToken },
                    loading: false
                })
                .then(function(result) {
                    var dd = window._readData();
                    var idx = dd.findIndex(function(x) { return x.email === em; });
                    if (idx !== -1) {
                        if (result.tokenStatus === 'valid') {
                            dd[idx].tokenStatus = 'valid';
                            dd[idx].permissionType = result.permissionType || 'O2';
                            validCount++;
                        } else {
                            dd[idx].tokenStatus = 'invalid';
                            dd[idx].permissionType = window.t('statusInvalid');
                        }
                        window._saveData(dd, false);
                    }
                })
                .catch(function() {})
                .finally(function() {
                    checkIdx++;
                    setTimeout(checkNext, 300);
                });
            }
            checkNext();
        }
    }

    function loadGroups() {
        var esc = window.escapeHtml || function(s) { return s == null ? '' : String(s); };
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [window.t('defaultGroup')];
        var data = window._readData();
        var groupList = document.getElementById('group-list');

        if (!groupList) return;

        groupList.innerHTML = groups.map(function(group) {
            var count = data.filter(function(item) { return item.group === group; }).length;
            return '<div class="group-item">' +
                '<div class="group-info">' +
                '<div class="group-icon"><i class="fas fa-folder"></i></div>' +
                '<div><div class="group-name">' + esc(group) + '</div>' +
                '<div class="group-count">' + count + ' ' + window.t('accounts') + '</div></div></div>' +
                '<div class="group-actions">' +
                '<button class="edit-btn" data-action="edit-group" data-group="' + esc(group).replace(/"/g, '&quot;') + '"><i class="fas fa-edit"></i></button>' +
                '<button class="delete-btn" data-action="delete-group" data-group="' + esc(group).replace(/"/g, '&quot;') + '"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
    }
    window.loadGroups = loadGroups;

    window.addGroup = function() {
        var name = document.getElementById('new-group-name').value.trim();
        if (!name) {
            window.showModal(window.t('ok'), window.t('enterGroupName'));
            return;
        }

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [window.t('defaultGroup')];
        if (groups.includes(name)) {
            window.showModal(window.t('ok'), window.t('groupExists'));
            return;
        }

        groups.push(name);
        localStorage.setItem('emailGroups', JSON.stringify(groups));
        window.syncGroupsToBackend();
        document.getElementById('new-group-name').value = '';
        loadGroups();
        updateGroupSelects();
        window.showModal(window.t('ok'), window.t('groupAdded'));
    };

    window.editGroup = function(oldName) {
        var newName = prompt(window.t('editGroupPrompt'), oldName);
        if (!newName || newName === oldName) return;

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        var index = groups.indexOf(oldName);
        if (index > -1) {
            groups[index] = newName;
            localStorage.setItem('emailGroups', JSON.stringify(groups));
            window.syncGroupsToBackend();

            var data = window._readData();
            data.forEach(function(item) {
                if (item.group === oldName) {
                    item.group = newName;
                }
            });
            window._saveData(data, true);

            loadGroups();
            window.loadData();
        }
    };

    window.deleteGroup = function(name) {
        if (!confirm(window.t('groupDeleteConfirm1') + name + window.t('groupDeleteConfirm2'))) return;

        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [];
        var index = groups.indexOf(name);
        if (index > -1) {
            groups.splice(index, 1);
            localStorage.setItem('emailGroups', JSON.stringify(groups));
            window.syncGroupsToBackend();

            var data = window._readData();
            data.forEach(function(item) {
                if (item.group === name) {
                    item.group = window.t('ungrouped');
                }
            });
            window._saveData(data, true);

            loadGroups();
            window.loadData();
        }
    };

    function updateGroupSelects() {
        var esc = window.escapeHtml || function(s) { return s == null ? '' : String(s); };
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [window.t('defaultGroup')];

        var filterSelect = document.getElementById('filter-group');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">' + window.t('allGroups') + '</option>' +
                groups.map(function(g) { return '<option value="' + esc(g).replace(/"/g, '&quot;') + '">' + esc(g) + '</option>'; }).join('');
        }

        var batchSelect = document.getElementById('batch-group-select');
        if (batchSelect) {
            batchSelect.innerHTML = '<option value="">' + window.t('selectGroupFirst') + '</option>' +
                groups.map(function(g) { return '<option value="' + esc(g).replace(/"/g, '&quot;') + '">' + esc(g) + '</option>'; }).join('');
        }
    }
    window.updateGroupSelects = updateGroupSelects;

    window.openBatchGroupModal = function() {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            window.showModal(window.t('ok'), window.t('selectEmailFirst'));
            return;
        }
        document.getElementById('batch-group-modal').style.display = 'flex';
    };

    window.closeBatchGroupModal = function() {
        document.getElementById('batch-group-modal').style.display = 'none';
    };

    window.applyBatchGroup = function() {
        var group = document.getElementById('batch-group-select').value;
        if (!group) {
            window.showModal(window.t('ok'), window.t('selectGroupFirst'));
            return;
        }

        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]:checked');
        var selectedEmails = Array.from(checkboxes).map(function(cb) { return cb.dataset.email; });
        var data = window._readData();

        data.forEach(function(item) {
            if (selectedEmails.includes(item.email)) {
                item.group = group;
            }
        });

        window._saveData(data, true);
        window.closeBatchGroupModal();
        window.loadData();
        window.showModal(window.t('ok'), window.t('batchGroupDone') + selectedEmails.length + window.t('batchGroupDone2'));
    };

    window.filterByStatus = function(status) {
        document.querySelectorAll('.sidebar ul li a').forEach(function(l) { l.classList.remove('active'); });
        var emailsTarget = document.querySelector('[data-target="emails"]');
        if (emailsTarget) emailsTarget.classList.add('active');
        document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
        var emailsSection = document.getElementById('emails');
        if (emailsSection) emailsSection.classList.add('active');

        document.getElementById('filter-status').value = status;
        window.filterByStatusSelect();
    };

    window.filterByStatusSelect = function() {
        var status = document.getElementById('filter-status').value;
        var data = window._readData();

        if (status) {
            if (status === 'unchecked') {
                window._filteredData = data.filter(function(item) { return item.tokenStatus !== 'valid' && item.tokenStatus !== 'invalid' && item.tokenStatus !== 'checking'; });
            } else {
                window._filteredData = data.filter(function(item) { return item.tokenStatus === status; });
            }
        } else {
            window._filteredData = null;
        }

        document.getElementById('filter-group').value = '';
        var searchInput = document.getElementById('topbar-search') || document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        window._currentPage = 1;
        if (window.renderTable) window.renderTable(data);
        if (window.renderPagination) window.renderPagination((window._filteredData || data).length);
        if (window.toggleNoData) window.toggleNoData((window._filteredData || data).length === 0);
    };

    function updateQuickGroups() {
        var esc = window.escapeHtml || function(s) { return s == null ? '' : String(s); };
        var groups = JSON.parse(localStorage.getItem('emailGroups')) || [window.t('defaultGroup')];
        var data = window._readData();
        var container = document.getElementById('quick-groups');

        if (!container) return;

        container.innerHTML = groups.slice(0, 5).map(function(group) {
            var count = data.filter(function(item) { return item.group === group; }).length;
            return '<div class="quick-group-item" data-action="quick-filter-group" data-group="' + esc(group).replace(/"/g, '&quot;') + '">' +
                '<span class="group-name"><i class="fas fa-folder"></i>' + esc(group) + '</span>' +
                '<span class="group-badge">' + count + '</span></div>';
        }).join('');
    }
    window.updateQuickGroups = updateQuickGroups;

    window.quickFilterGroup = function(group) {
        document.querySelectorAll('.sidebar ul li a').forEach(function(l) { l.classList.remove('active'); });
        var emailsTarget = document.querySelector('[data-target="emails"]');
        if (emailsTarget) emailsTarget.classList.add('active');
        document.querySelectorAll('.content-section').forEach(function(s) { s.classList.remove('active'); });
        var emailsSection = document.getElementById('emails');
        if (emailsSection) emailsSection.classList.add('active');

        document.getElementById('filter-group').value = group;
        if (window.filterByGroup) window.filterByGroup();
    };

    window._refreshRunning = false;

    window.stopRefreshAll = function() {
        if (window._refreshRunning) {
            window._refreshRunning = false;
            var modalEl = document.getElementById('modal');
            if (modalEl) modalEl.style.display = 'none';
            window._saveData(window._readData(), true);
            window.loadData();
            window.showToast(window.t('statusChecking') + ' ' + window.t('ok') + ' - ' + window.t('cancel'));
        }
    };

    window.refreshAllStatus = function() {
        var data = window._readData();
        if (data.length === 0) {
            window.showModal(window.t('ok'), window.t('noDataRefresh'));
            return;
        }

        if (window._refreshRunning) return;

        window._refreshRunning = true;
        window._refreshModalVisible = true;

        var total = data.length;
        var current = 0;

        var modalEl = document.getElementById('modal');
        modalEl.onclick = function(e) {
            if (e.target === modalEl) {
                window._refreshModalVisible = false;
                modalEl.style.display = 'none';
            }
        };

        showCheckingProgress(0, total);

        function next() {
            if (!window._refreshRunning || current >= total) {
                var wasStopped = !window._refreshRunning && current < total;
                window._refreshRunning = false;
                if (window._refreshModalVisible) {
                    modalEl.style.display = 'none';
                }
                modalEl.onclick = null;
                window._saveData(window._readData(), true);
                window.loadData();
                if (wasStopped) {
                    window.showToast(window.t('statusChecking') + ' ' + window.t('cancel') + ' - ' + current + '/' + total);
                } else {
                    window.showToast(window.t('statusChecking') + ' ' + window.t('ok') + ' - ' + total + ' ' + window.t('accounts'));
                }
                return;
            }

            var freshData = window._readData();
            var item = freshData[current];
            if (!item || !item.clientId || !item.refreshToken) {
                current++;
                if (window._refreshModalVisible) showCheckingProgress(current, total);
                setTimeout(next, 50);
                return;
            }

            window.apiCall('/api/check-single', {
                method: 'POST',
                body: { email: item.email, clientId: item.clientId, refreshToken: item.refreshToken },
                loading: false
            })
                .then(function(result) {
                    var d = window._readData();
                    var idx = d.findIndex(function(x) { return x.email === item.email; });
                    if (idx !== -1) {
                        if (result.tokenStatus === 'valid') {
                            d[idx].tokenStatus = 'valid';
                            d[idx].permissionType = result.permissionType || 'O2';
                        } else {
                            d[idx].tokenStatus = 'invalid';
                            d[idx].permissionType = result.error || window.t('statusInvalid');
                        }
                        window._saveData(d, false);
                        if (window.updateTableRow) window.updateTableRow(item.email, d[idx]);
                        if (window.updateStats) window.updateStats();
                    }
                })
                .catch(function(error) {
                    console.error('[批量检测] ❌ 检测失败:', item.email, error);

                    var errData = window._readData();
                    var errorIdx = errData.findIndex(function(x) { return x.email === item.email; });
                    if (errorIdx !== -1) {
                        errData[errorIdx].tokenStatus = 'unchecked';
                        errData[errorIdx].permissionType = '';
                        window._saveData(errData, false);
                        if (window.updateTableRow) window.updateTableRow(item.email, errData[errorIdx]);
                        if (window.updateStats) window.updateStats();
                    }
                })
                .finally(function() {
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
        document.getElementById('modal-title').textContent = window.t('statusChecking');
        document.getElementById('modal-message').innerHTML =
            '<div style="text-align:center">' +
            '<div style="font-size:32px;color:#3498db;margin-bottom:10px">' + percent + '%</div>' +
            '<div style="background:#e8f4fc;border-radius:10px;height:8px;overflow:hidden;margin-bottom:10px">' +
            '<div style="background:linear-gradient(90deg,#3498db,#5dade2);height:100%;width:' + percent + '%;transition:width 0.3s"></div></div>' +
            '<div style="color:#7f8c8d;font-size:13px">' + window.t('statusChecking') + ' ' + current + ' / ' + total + ' ' + window.t('accounts') + '</div>' +
            '<button onclick="window.stopRefreshAll()" style="margin-top:12px;padding:8px 20px;background:linear-gradient(135deg,#e74c3c,#ec7063);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">' +
            '<i class="fas fa-stop" style="margin-right:4px;"></i>' + window.t('cancel') + '</button>' +
            '</div>';
        var okBtn = modalEl.querySelector('.modal-content > button');
        if (okBtn && okBtn.onclick === null) okBtn.style.display = 'none';
        if (window._refreshModalVisible) modalEl.style.display = 'flex';
    }

    window.clearAllData = function() {
        var data = window._readData();
        if (data.length === 0) {
            window.showModal(window.t('ok'), window.t('noDataRefresh'));
            return;
        }

        if (!confirm(window.t('clearConfirm'))) return;

        localStorage.removeItem('emailData');
        if (window._invalidateDataCache) window._invalidateDataCache();
        window.syncToBackend();
        window.loadData();
        window.showModal(window.t('ok'), window.t('clearSuccess'));
    };

})();