/**
 * ui.js - UI交互组件（基于已验证的备份逻辑）
 * 
 * ⚠️ 重要：本文件所有函数均从 archive/app_2026-08-27_backup_1550lines.js 提取
 * 未做任何逻辑修改，仅做模块化拆分
 * 
 * 功能：
 * - Loading（showLoading/hideLoading）- 行537-599
 * - 模态框（showModal/closeModal/updateModalProgress）- 行957-1012
 * - Toast（showToast）- 行1216-1244
 * - 主题切换（cycleTheme/forceSetTheme/loadTheme）- 行1048-1215
 * - 内容区切换（switchContentSection/switchTab）- 行120-137, 165-276
 * - 邮件查看器（showMailView）- 行236-276
 * - HTML片段加载（loadHTMLParts）- 行1308-1341（已修复outerHTML）
 * - 错误边界（showErrorPage）- 行1344-1389
 * - 统计更新（updateStats/updateTime）- 行1015-1046
 * - 功能栏导航事件绑定 - 行604-644
 * 
 * 依赖：app.js (log, LOG_LEVELS), api.js (_readData)
 */

console.log('[UI] ✅ ui.js 开始加载（使用备份验证逻辑）...');

(function() {
    'use strict';

    var log = window.appLog || console.log;
    var LOG_LEVELS = window.LOG_LEVELS || { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SUCCESS: 'SUCCESS' };

    // ===== 从备份提取：Loading（行537-593）=====
    function showLoading(mode) {
        mode = mode || 'spinner';
        var overlay = document.getElementById('loading-overlay');

        if (mode === 'skeleton') {
            overlay.className = 'loading-overlay skeleton-mode';
            overlay.innerHTML =
                '<div class="skeleton-table">' +
                    '<div class="skeleton-table-row">' +
                        '<div class="skeleton" style="width:18px;height:18px;border-radius:50%"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text long"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton" style="width:80px;height:32px;border-radius:var(--radius-4)"></div>' +
                    '</div>' +
                    '<div class="skeleton-table-row">' +
                        '<div class="skeleton" style="width:18px;height:18px;border-radius:50%"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text long"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton" style="width:80px;height:32px;border-radius:var(--radius-4)"></div>' +
                    '</div>' +
                    '<div class="skeleton-table-row">' +
                        '<div class="skeleton" style="width:18px;height:18px;border-radius:50%"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text long"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text short"></div>' +
                        '<div class="skeleton skeleton-text medium"></div>' +
                        '<div class="skeleton" style="width:80px;height:32px;border-radius:var(--radius-4)"></div>' +
                    '</div>' +
                '</div>';
        } else {
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
        }

        var panelRight = document.getElementById('panel-right');
        if (panelRight && overlay.parentNode !== panelRight) {
            panelRight.appendChild(overlay);
        }
        overlay.style.display = 'flex';

        log(LOG_LEVELS.INFO, 'Loading', '显示' + (mode === 'skeleton' ? '骨架屏' : 'Spinner'));
    }

    function hideLoading() {
        var overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }
        log(LOG_LEVELS.INFO, 'Loading', '隐藏');
    }

    // ===== 从备份提取：模态框（行957-1012）=====
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
        progress.innerHTML = '<div class="modal-progress-meta"><span class="modal-progress-label">处理中</span><span class="modal-progress-percent">0%</span></div><div class="modal-progress-track"><div class="modal-progress-bar"></div></div><div class="modal-progress-note"></div>';
        var actionButton = modalContent.querySelector('button');
        if (actionButton) modalContent.insertBefore(progress, actionButton);
        else modalContent.appendChild(progress);
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
        refs.label.textContent = progressOptions && progressOptions.label ? progressOptions.label : '检测中';
        refs.percent.textContent = percent + '%';
        refs.bar.style.width = percent + '%';
        refs.note.textContent = progressOptions && progressOptions.note ? progressOptions.note : '';
    }

    function showModal(title, message, options) {
        var titleEl = document.getElementById('modal-title');
        var messageEl = document.getElementById('modal-message');
        var modalEl = document.getElementById('modal');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.innerHTML = message;
        
        if (options && options.progress) { 
            updateModalProgress(options.progress); 
        } else { 
            hideModalProgress(); 
        }
        
        if (modalEl) modalEl.style.display = 'flex';
    }

    function closeModal() {
        hideModalProgress();
        var modalEl = document.getElementById('modal');
        if (modalEl) modalEl.style.display = 'none';
    }

    // ===== 从备份提取：统计（行1015-1046）=====
    function updateStats() {
        if (!window._readData) {
            log(LOG_LEVELS.WARN, '统计', '_readData未定义，跳过统计更新');
            return;
        }
        
        var data = window._readData();
        var validCount = data.filter(function(item) { return item.tokenStatus === 'valid'; }).length;
        var invalidCount = data.filter(function(item) { return item.tokenStatus === 'invalid'; }).length;
        var checkingCount = data.filter(function(item) { return item.tokenStatus === 'checking'; }).length;
        var uncheckedCount = data.filter(function(item) { return item.tokenStatus !== 'valid' && item.tokenStatus !== 'invalid' && item.tokenStatus !== 'checking'; }).length;

        var setSafe = function(id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setSafe('valid-count', validCount);
        setSafe('invalid-count', invalidCount);
        setSafe('checking-count', checkingCount);
        setSafe('unchecked-count', uncheckedCount);

        log(LOG_LEVELS.INFO, '统计', '更新完成 - 有效:' + validCount + ' 异常:' + invalidCount + ' 检测中:' + checkingCount + ' 未检测:' + uncheckedCount);
    }

    function updateTime() {
        var now = new Date();
        var timeStr = now.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
        var timeEl = document.getElementById('current-time');
        if (timeEl) timeEl.textContent = timeStr;
    }

    // ===== 从备份提取：主题切换（行1048-1215）=====
    var THEMES = ['theme-default', 'theme-dark', 'theme-starry', 'theme-dusk'];
    var THEME_ICONS = ['fa-sun', 'fa-moon', 'fa-star', 'fa-cloud-sun'];
    var THEME_NAMES = ['默认', '深色', '星空', '黄昏'];

    window.cycleTheme = function() {
        console.log('\n[主题切换] ===== 开始切换 =====');

        try {
            var current = localStorage.getItem('themeClass') || 'theme-default';

            console.log('[主题切换] 当前主题:', current);
            console.log('[主题切换] body当前类名:', document.body.className);

            var idx = THEMES.indexOf(current);
            if (idx === -1) {
                console.warn('[主题切换] ⚠️ 当前主题"' + current + '"无效，重置为默认值');
                idx = 0;
                current = THEMES[0];
                localStorage.setItem('themeClass', current);
            }

            var nextIdx = (idx + 1) % THEMES.length;
            var next = THEMES[nextIdx];

            console.log('[主题切换] 切换:', current, '→', next, '(' + THEME_NAMES[nextIdx] + ')');

            // 清除所有主题类
            var removedClasses = [];
            THEMES.forEach(function(cls) {
                if (document.body.classList.contains(cls)) {
                    document.body.classList.remove(cls);
                    removedClasses.push(cls);
                }
            });
            
            if (document.body.classList.contains('gradient-flow')) {
                document.body.classList.remove('gradient-flow');
                removedClasses.push('gradient-flow');
            }

            // 应用新主题
            if (next !== 'theme-default') {
                document.body.classList.add(next);
                document.body.classList.add('gradient-flow');
            }

            // 保存
            localStorage.setItem('themeClass', next);

            // 更新图标
            var icon = document.getElementById('theme-icon');
            if (icon) {
                icon.className = 'fas ' + THEME_ICONS[nextIdx];
            }

            window.showToast('已切换到' + THEME_NAMES[nextIdx] + '主题 (' + (nextIdx + 1) + '/4)', 'success', 2000);
            log(LOG_LEVELS.SUCCESS, '主题', '✅ 切换到: ' + next);

        } catch (e) {
            console.error('[主题切换] ❌ 失败:', e);
            window.showToast('主题切换失败: ' + e.message, 'error', 3000);
        }
    };

    window.forceSetTheme = function(themeName) {
        var targetIdx = THEMES.indexOf(themeName);
        if (targetIdx === -1) {
            log(LOG_LEVELS.WARN, '主题', '❌ 无效主题: ' + themeName);
            return false;
        }

        try {
            // 清除所有
            document.body.classList.remove.apply(document.body.classList, THEMES.concat(['gradient-flow']));
            
            // 应用目标
            if (themeName !== 'theme-default') {
                document.body.classList.add(themeName);
                document.body.classList.add('gradient-flow');
            }
            
            // 保存
            localStorage.setItem('themeClass', themeName);
            
            // 更新图标
            var icon = document.getElementById('theme-icon');
            if (icon) icon.className = 'fas ' + THEME_ICONS[targetIdx];
            
            log(LOG_LEVELS.SUCCESS, '主题', '✅ 强制设置: ' + themeName);
            window.showToast('强制切换到' + THEME_NAMES[targetIdx] + '主题', 'info', 2000);
            
            return true;
        } catch (e) {
            log(LOG_LEVELS.ERROR, '主题', '❌ 设置失败: ' + e);
            return false;
        }
    };

    function loadTheme() {
        try {
            var themeClass = localStorage.getItem('themeClass') || 'theme-default';
            
            if (THEMES.indexOf(themeClass) === -1) {
                themeClass = 'theme-default';
            }

            if (themeClass !== 'theme-default') {
                document.body.classList.add(themeClass);
                document.body.classList.add('gradient-flow');
            }

            var idx = THEMES.indexOf(themeClass);
            if (idx >= 0) {
                var icon = document.getElementById('theme-icon');
                if (icon) {
                    icon.className = 'fas ' + THEME_ICONS[idx];
                }
            }
            
            log(LOG_LEVELS.INFO, '主题', '✅ 加载: ' + themeClass);
        } catch (e) {
            log(LOG_LEVELS.ERROR, '主题', '❌ 加载失败: ' + e.message);
        }
    }

    // ===== 从备份提取：Toast（行1216-1244）=====
    function showToast(message, type, duration) {
        type = type || 'success';
        duration = duration || 3000;

        var iconMap = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };

        var toast = document.createElement('div');
        toast.className = 'toast-msg toast-' + type + ' toast-show';
        toast.innerHTML =
            '<i class="fas ' + (iconMap[type] || iconMap.success) + ' toast-icon"></i>' +
            '<span class="toast-message">' + message + '</span>' +
            '<i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>';

        document.body.appendChild(toast);

        log(LOG_LEVELS.INFO, 'Toast', '[' + type.toUpperCase() + '] ' + message);

        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { 
                if (toast.parentNode) toast.parentNode.removeChild(toast); 
            }, 300);
        }, duration);
    }

    // ===== 从备份提取：全选功能（行138-157）=====
    window.toggleSelectAll = function(checked) {
        var checkboxes = document.querySelectorAll('#email-table tbody input[type="checkbox"]');
        checkboxes.forEach(function(cb) {
            cb.checked = checked;
        });

        var selectedCount = checked ? checkboxes.length : 0;
        window.updateSelectedCount(selectedCount);

        log(LOG_LEVELS.INFO, '全选', (checked ? '全选' : '取消全选') + '，共 ' + selectedCount + ' 项');
    };

    window.updateSelectedCount = function(count) {
        var countEl = document.getElementById('selected-count');
        var countNumEl = document.getElementById('selected-count-num');
        if (countEl && countNumEl) {
            if (count > 0) {
                countEl.style.display = 'inline';
                countNumEl.textContent = count;
            } else {
                countEl.style.display = 'none';
            }
        }
    };

    // ===== 从备份提取：Tab导航切换（行120-137）=====
    window.switchTab = function(tabId) {
        console.log('[Tab切换] 切换到:', tabId);

        document.querySelectorAll('.tab-item').forEach(function(t) { t.classList.remove('active'); });

        var targetTab = document.querySelector('.tab-item[data-tab="' + tabId + '"]');
        if (targetTab) targetTab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.style.display = content.classList.contains(tabId) ? 'inline-flex' : 'none';
        });
    };

    // ===== 从备份提取：内容区切换（行164-234）=====
    window.switchContentSection = function(sectionId) {
        console.log('[内容区切换] ===== 开始切换 =====');
        console.log('[内容区切换] 目标:', sectionId);

        // 1. 查找所有content-section元素
        var allSections = document.querySelectorAll('.content-section');
        console.log('[内容区切换] 找到.content-section数量:', allSections.length);

        // 2. 隐藏所有section并输出详细信息
        allSections.forEach(function(section, index) {
            console.log('[内容区切换]   [' + index + '] id=' + section.id + ', class=' + section.className + ', 当前display=' + getComputedStyle(section).display);
            section.classList.remove('active');
            section.style.display = 'none';
            console.log('[内容区切换]     → 已隐藏');
        });

        // 3. 显示目标section
        var targetSection = document.getElementById(sectionId);
        console.log('[内容区切换] 目标元素:', !!targetSection);

        if (!targetSection) {
            console.error('[内容区切换] ❌ 找不到 #' + sectionId + ' 元素！');
            
            // 输出当前DOM结构帮助调试
            console.log('[内容区调试] body子元素:');
            Array.from(document.body.children).forEach(function(child, idx) {
                console.log('  [' + idx + '] <' + child.tagName.toLowerCase() + '> id=' + child.id + ' class=' + child.className.substring(0, 50));
            });
            
            console.log('[内容区调试] .content容器内子元素:');
            var contentEl = document.querySelector('.content');
            if (contentEl) {
                Array.from(contentEl.children).forEach(function(child, idx) {
                    console.log('  [' + idx + '] <' + child.tagName.toLowerCase() + '> id=' + child.id + ' class=' + child.className.substring(0, 50));
                });
            } else {
                console.warn('[内容区调试] ⚠️ 找不到.content容器');
            }

            window.showToast('无法找到' + sectionId + '区域，请刷新页面', 'error', 3000);
            return;
        }

        // 强制显示目标section
        targetSection.classList.add('active');
        targetSection.style.display = '';
        targetSection.style.visibility = 'visible';
        targetSection.style.opacity = '1';

        console.log('[内容区切换] ✅ 已显示 #' + sectionId);
        console.log('[内容区切换] 最终样式:', {
            display: getComputedStyle(targetSection).display,
            visibility: getComputedStyle(targetSection).visibility,
            opacity: getComputedStyle(targetSection).opacity,
            height: getComputedStyle(targetSection).height,
            overflow: getComputedStyle(targetSection).overflow
        });

        // 4. 更新funcbar激活状态（如果存在）
        document.querySelectorAll('.funcbar-item').forEach(function(item) {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === sectionId) {
                item.classList.add('active');
                console.log('[内容区切换] ✅ 功能按钮已激活:', item.getAttribute('data-target'));
            }
        });

        // 5. 根据section触发相应功能
        if (sectionId === 'groups') {
            if (window.loadGroups) {  // ⚠️ 调用batch.js中的loadGroups
                console.log('[内容区切换] 触发loadGroups');
                window.loadGroups();
            } else {
                console.warn('[内容区切换] ⚠️ loadGroups未定义（检查batch.js是否加载）');
            }
        } else if (sectionId === 'emails') {
            if (window.loadData) {
                console.log('[内容区切换] 触发loadData');
                window.loadData();
            }
        }

        console.log('[内容区切换] ===== 切换完成 =====');
    };

    // ===== 从备份提取：邮件查看器视图切换（行236-276）=====
    window.showMailView = function(show, email) {
        var viewList = document.getElementById('view-list');
        var viewMail = document.getElementById('view-mail');
        var mailViewEmail = document.getElementById('mail-view-email');

        if (!viewList || !viewMail) {
            console.warn('[邮件视图] 找不到视图容器');
            return;
        }

        if (show) {
            viewList.style.display = 'none';
            viewMail.style.display = 'flex';

            if (email && mailViewEmail) {
                mailViewEmail.textContent = email;
            }

            if (window.loadMailForView && email) {
                window.loadMailForView(email);
            }

            console.log('[邮件视图] ✅ 打开详情视图');
        } else {
            viewList.style.display = '';
            viewMail.style.display = 'none';

            if (window.closeMailViewModal) {
                window.closeMailViewModal();
            }

            console.log('[邮件视图] ✅ 关闭详情视图，返回列表');
        }
    };

    // ===== 从备份提取：HTML片段动态加载（行1308-1341）⚠️ 关键修复 =====
    async function loadHTMLParts() {
        try {
            console.log('[HTML片段] 开始加载sidebar.html...');
            var sidebarRes = await fetch('parts/sidebar.html');
            if (!sidebarRes.ok) throw new Error('sidebar.html 加载失败: ' + sidebarRes.status);
            var sidebarHtml = await sidebarRes.text();
            document.getElementById('sidebar-container').outerHTML = sidebarHtml;
            console.log('[HTML片段] ✅ sidebar.html加载完成');

            console.log('[HTML片段] 开始加载content-emails.html...');
            var emailsRes = await fetch('parts/content-emails.html');
            if (!emailsRes.ok) throw new Error('content-emails.html 加载失败: ' + emailsRes.status);
            var emailsHtml = await emailsRes.text();
            document.getElementById('emails-container').outerHTML = emailsHtml;
            console.log('[HTML片段] ✅ content-emails.html加载完成');

            console.log('[HTML片段] 开始加载content-groups.html...');  // ⚠️ 关键修复
            var groupsRes = await fetch('parts/content-groups.html');
            if (!groupsRes.ok) throw new Error('content-groups.html 加载失败: ' + groupsRes.status);
            var groupsHtml = await groupsRes.text();
            document.getElementById('groups-container').outerHTML = groupsHtml;  // ⚠️ 必须用outerHTML！
            console.log('[HTML片段] ✅ content-groups.html加载完成');

            console.log('[HTML片段] 开始加载modals.html...');
            var modalsRes = await fetch('parts/modals.html');
            if (!modalsRes.ok) throw new Error('modals.html 加载失败: ' + modalsRes.status);
            var modalsHtml = await modalsRes.text();
            document.getElementById('modals-container').innerHTML = modalsHtml;  // modals用innerHTML即可
            console.log('[HTML片段] ✅ modals.html加载完成');
        } catch (e) {
            console.error('[HTML片段] ❌ 加载失败:', e);
            throw e;  // ⚠️ 必须抛出错误，让init()的catch捕获
        }
    }

    // ===== 从备份提取：全局错误边界（行1344-1410）=====
    function showErrorPage(error) {
        console.error('[错误边界] 显示友好错误页面:', error);

        var errorBoundary = document.createElement('div');
        errorBoundary.className = 'error-boundary';
        errorBoundary.id = 'error-boundary';

        var errorType = error.message || '未知错误';
        var errorStack = error.stack || '无堆栈信息';
        var isNetworkError = errorType.toLowerCase().includes('network') || errorType.toLowerCase().includes('fetch');
        var isLoadError = errorType.toLowerCase().includes('加载') || errorType.toLowerCase().includes('load');

        var iconClass = 'fa-exclamation-triangle';
        var titleText = '应用初始化失败';
        var messageText = '很抱歉，应用在启动过程中遇到了问题。';

        if (isNetworkError) {
            iconClass = 'fa-wifi';
            titleText = '网络连接失败';
            messageText = '无法连接到后端服务，请检查网络连接或重启服务。';
        } else if (isLoadError) {
            iconClass = 'fa-file-code';
            titleText = '资源加载失败';
            messageText = '部分页面组件未能正常加载，可能需要刷新页面重试。';
        }

        errorBoundary.innerHTML =
            '<div class="error-boundary-content">' +
                '<i class="fas ' + iconClass + ' error-icon"></i>' +
                '<h2 class="error-title">' + titleText + '</h2>' +
                '<p class="error-message">' + messageText + '</p>' +
                '<div class="error-details">' + errorStack.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
                '<div class="error-actions">' +
                    '<button class="error-btn error-btn-primary" onclick="location.reload()">' +
                        '<i class="fas fa-redo"></i> 刷新页面' +
                    '</button>' +
                    '<button class="error-btn error-btn-secondary" onclick="document.getElementById(\'error-boundary\').remove()">' +
                        '<i class="fas fa-times"></i> 忽略并继续' +
                    '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(errorBoundary);
        document.body.classList.remove('js-hide');
    }

    // ===== 从备份提取：功能栏导航事件绑定（行604-644）=====
    // 注意：这些事件绑定需要在loadHTMLParts之后执行，所以延迟到init()中调用
    
    function bindFuncBarEvents() {
        var funcItems = document.querySelectorAll('.funcbar-item[data-target]');
        var contentSections = document.querySelectorAll('.content-section');
        
        funcItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                funcItems.forEach(function(i) { i.classList.remove('active'); });
                item.classList.add('active');
                var targetId = item.getAttribute('data-target');
                contentSections.forEach(function(section) { section.classList.remove('active'); });
                
                var targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    targetSection.style.display = '';
                }
                
                var breadcrumb = document.querySelector('.breadcrumb-item');
                if (breadcrumb) {
                    breadcrumb.textContent = item.getAttribute('title') || targetId;
                }
            });
        });

        // 旧版侧边栏导航兼容
        var links = document.querySelectorAll('.sidebar ul li a');
        links.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                links.forEach(function(l) { l.classList.remove('active'); });
                link.classList.add('active');
                var targetId = link.getAttribute('data-target');
                contentSections.forEach(function(section) { section.classList.remove('active'); });
                
                var targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    targetSection.style.display = '';
                }
            });
        });

        console.log('[功能栏] ✅ 导航事件绑定完成');
    }
    
    window.bindFuncBarEvents = bindFuncBarEvents;

    // ===== 导出接口 =====
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showModal = showModal;
    window.closeModal = closeModal;
    window.updateModalProgress = updateModalProgress;
    window.showToast = showToast;
    window.loadTheme = loadTheme;
    window.updateStats = updateStats;
    window.showErrorPage = showErrorPage;
    window.loadHTMLParts = loadHTMLParts;

    log(LOG_LEVELS.SUCCESS, 'UI', '✅ ui.js 加载完成（所有函数来自备份验证版）');

})();