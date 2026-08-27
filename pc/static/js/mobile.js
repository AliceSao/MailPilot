/**
 * mobile.js - 移动端专用逻辑（与PC完全隔离）
 * 
 * 设计原则：
 * - PC和移动端使用完全独立的两套逻辑
 * - 通过屏幕宽度检测自动切换（断点: 768px）
 * - 移动端独有功能：汉堡菜单、滑出式侧边栏、邮件详情切换、横屏按钮
 * - 所有移动端事件通过 data-action="mobile-*" 触发
 * 
 * 依赖：app.js (showToast, t)
 */

(function() {
    'use strict';

    // ===== 配置常量 =====
    var MOBILE_BREAKPOINT = 768; // 移动端断点（px）
    var _isMobile = false;
    var _isInitialized = false;

    // ===== 工具函数 =====
    function isMobileDevice() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function log(prefix, msg) {
        console.log('[移动端-' + prefix + '] ' + msg);
    }

    // ===== 初始化函数 =====
    function init() {
        if (_isInitialized) return;

        log('INIT', '===== 移动端模块初始化 =====');
        
        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);
        
        // 初始检测
        handleResize();

        // 注册移动端专属事件委托
        registerMobileEvents();

        _isInitialized = true;
        log('INIT', '✅ 初始化完成');
    }

    function handleResize() {
        var wasMobile = _isMobile;
        _isMobile = isMobileDevice();

        log('RESIZE', '屏幕宽度:' + window.innerWidth + 'px, 是否移动端:' + _isMobile);

        if (_isMobile && !wasMobile) {
            // 切换到移动模式
            onEnterMobileMode();
        } else if (!_isMobile && wasMobile) {
            // 切换到PC模式
            onExitMobileMode();
        }

        // 更新UI状态
        updateMobileUI();
    }

    function onEnterMobileMode() {
        log('MODE', '📱 进入移动端模式');

        // 1. 显示汉堡按钮
        var hamburgerBtn = document.getElementById('hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.style.display = 'flex';

        // 2. 重置侧边栏状态（移除所有移动端类和内联样式）
        resetSidebarState();

        // 3. 确保侧边栏默认关闭
        closeMobileSidebar();

        log('MODE', '✅ 移动端初始化完成');
    }

    function onExitMobileMode() {
        log('MODE', '🖥️ 退出移动端模式（回到PC模式）');

        // 1. 隐藏汉堡按钮
        var hamburgerBtn = document.getElementById('hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.style.display = 'none';

        // 2. 完全重置侧边栏（关键！清除移动端遗留状态）
        resetSidebarState();

        // 3. 恢复PC端Grid布局
        restorePCLayout();

        // 4. 重置邮件查看器状态
        resetMailViewForPC();

        log('MODE', '✅ PC模式恢复完成');
    }

    // 重置侧边栏到初始状态（核心修复函数）
    function resetSidebarState() {
        log('RESET', '===== 重置侧边栏状态 =====');

        var sidebar = document.querySelector('.main-layout .sidebar');
        var overlay = document.getElementById('mobile-sidebar-overlay');

        if (sidebar) {
            // 移除所有移动端相关类
            sidebar.classList.remove('mobile-visible', 'collapsed');
            
            // 清除所有内联样式（让CSS完全控制）
            sidebar.removeAttribute('style');
            
            // 确保display为默认值（由CSS Grid控制）
            sidebar.style.display = '';
            
            log('RESET', '✅ 侧边栏类名已清理:', sidebar.className);
        }

        if (overlay) {
            overlay.classList.remove('active');
            overlay.removeAttribute('style');
            overlay.style.display = 'none';
            
            log('RESET', '✅ 遮罩层已隐藏');
        }
    }

    // 恢复PC端三列Grid布局
    function restorePCLayout() {
        log('LAYOUT', '恢复PC端Grid布局');

        var mainLayout = document.querySelector('.main-layout');
        if (mainLayout) {
            // 移除之前可能修改的grid-template-columns
            mainLayout.style.removeProperty('grid-template-columns');
            
            log('LAYOUT', '✅ Grid布局已恢复为默认三列');
        }
    }

    function updateMobileUI() {
        // 更新可见元素
        var mobileElements = document.querySelectorAll('.mobile-only');
        var pcElements = document.querySelectorAll('.pc-only');

        mobileElements.forEach(function(el) {
            el.style.display = _isMobile ? '' : 'none';
        });

        pcElements.forEach(function(el) {
            el.style.display = _isMobile ? 'none' : '';
        });
    }

    // ===== 移动端侧边栏控制 =====
    window.toggleMobileSidebar = function() {
        log('SIDEBAR', '===== 切换移动端侧边栏 =====');

        if (!_isMobile) {
            log('SIDEBAR', '⚠️ 当前非移动端模式，忽略操作');
            return;
        }

        var sidebar = document.querySelector('.main-layout .sidebar');
        var overlay = document.getElementById('mobile-sidebar-overlay');
        var hamburgerBtn = document.getElementById('hamburger-btn');

        if (!sidebar || !overlay) {
            log('SIDEBAR', '❌ 找不到必要DOM元素');
            window.showToast('侧边栏未加载完成', 'error', 2000);
            return;
        }

        var isVisible = sidebar.classList.contains('mobile-visible');
        log('SIDEBAR', '当前状态:', isVisible ? '已打开' : '已关闭');

        try {
            if (isVisible) {
                closeMobileSidebar();
            } else {
                openMobileSidebar(sidebar, overlay, hamburgerBtn);
            }
        } catch (e) {
            log('SIDEBAR', '❌ 操作失败:', e.message);
            window.showToast('操作失败: ' + e.message, 'error', 2000);
        }
    };

    function openMobileSidebar(sidebar, overlay, hamburgerBtn) {
        log('SIDEBAR', '打开侧边栏');

        // 显示遮罩层（使用!important确保覆盖）
        overlay.style.display = 'block';
        overlay.style.opacity = '1';
        overlay.classList.add('active');

        // 显示侧边栏
        sidebar.classList.add('mobile-visible');
        sidebar.style.display = 'flex';
        sidebar.style.transform = 'translateX(0)';

        // 更新汉堡图标
        if (hamburgerBtn) {
            var icon = hamburgerBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-times';
        }

        log('SIDEBAR', '✅ 成功打开');
    }

    function closeMobileSidebar() {
        log('SIDEBAR', '关闭侧边栏');

        var sidebar = document.querySelector('.main-layout .sidebar');
        var overlay = document.getElementById('mobile-sidebar-overlay');
        var hamburgerBtn = document.getElementById('hamburger-btn');

        if (sidebar) {
            sidebar.classList.remove('mobile-visible');
            sidebar.style.transform = 'translateX(-100%)';
            
            // 延迟隐藏以允许动画完成
            setTimeout(function() {
                if (!sidebar.classList.contains('mobile-visible')) {
                    sidebar.style.display = 'none';
                }
            }, 300);
        }

        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.opacity = '0';
            
            setTimeout(function() {
                if (!overlay.classList.contains('active')) {
                    overlay.style.display = 'none';
                }
            }, 300);
        }

        if (hamburgerBtn) {
            var icon = hamburgerBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        }

        log('SIDEBAR', '✅ 成功关闭');
    }

    // 点击遮罩层关闭侧边栏
    function handleOverlayClick(e) {
        if (e.target.id === 'mobile-sidebar-overlay' && e.target.classList.contains('active')) {
            log('OVERLAY', '点击遮罩层关闭侧边栏');
            closeMobileSidebar();
        }
    }

    // ===== 移动端邮件详情切换 =====
    window.toggleMobileMailDetail = function() {
        log('MAILVIEW', '===== 切换邮件详情视图 =====');

        if (!_isMobile) {
            log('MAILVIEW', '⚠️ 当前非移动端模式，忽略操作');
            return;
        }

        var contentPanel = document.getElementById('mail-content-panel');
        var listPanel = document.getElementById('mail-list-panel');
        var mobileBtn = document.getElementById('mobile-view-detail-btn');

        if (!contentPanel || !listPanel) {
            log('MAILVIEW', '❌ 找不到邮件面板元素');
            return;
        }

        var isContentVisible = contentPanel.classList.contains('mobile-visible');
        log('MAILVIEW', '当前状态:', isContentVisible ? '显示详情' : '显示列表');

        if (isContentVisible) {
            // 返回列表视图
            contentPanel.classList.remove('mobile-visible');
            listPanel.style.display = 'block';
            
            if (mobileBtn) {
                mobileBtn.querySelector('span').textContent = '查看详情';
                mobileBtn.querySelector('i').className = 'fas fa-arrow-right';
            }
            
            log('MAILVIEW', '→ 切换到列表视图');
        } else {
            // 切换到详情视图
            contentPanel.classList.add('mobile-visible');
            listPanel.style.display = 'none';
            
            if (mobileBtn) {
                mobileBtn.querySelector('span').textContent = '返回列表';
                mobileBtn.querySelector('i').className = 'fas fa-arrow-left';
            }
            
            log('MAILVIEW', '→ 切换到详情视图');
        }
    };

    // 当选中邮件时自动显示详情按钮（移动端）
    window.showMobileMailDetailButton = function() {
        if (!_isMobile) return;

        var mobileBtn = document.getElementById('mobile-view-detail-btn');
        var contentPanel = document.getElementById('mail-content-panel');

        if (mobileBtn && contentPanel) {
            mobileBtn.style.display = 'flex';
            contentPanel.classList.add('mobile-visible');
            
            // 隐藏列表面板
            var listPanel = document.getElementById('mail-list-panel');
            if (listPanel) listPanel.style.display = 'none';

            // 更新按钮文字
            mobileBtn.querySelector('span').textContent = '返回列表';
            mobileBtn.querySelector('i').className = 'fas fa-arrow-left';

            log('MAILVIEW', '✅ 自动显示详情按钮并展开内容区');
        }
    };

    function resetMailViewForPC() {
        log('MAILVIEW', '重置邮件查看器到PC模式');

        var contentPanel = document.getElementById('mail-content-panel');
        var listPanel = document.getElementById('mail-list-panel');
        var mobileBtn = document.getElementById('mobile-view-detail-btn');

        if (contentPanel) {
            contentPanel.classList.remove('mobile-visible');
            contentPanel.style.display = '';
        }

        if (listPanel) {
            listPanel.style.display = '';
        }

        if (mobileBtn) {
            mobileBtn.style.display = 'none';
        }
    }

    // ===== 横屏/竖屏切换（预留接口）=====
    window.toggleOrientation = function() {
        log('ORIENTATION', '切换横屏/竖屏');

        if (!_isMobile) {
            log('ORIENTATION', '⚠️ 仅移动端支持此功能');
            window.showToast('此功能仅限移动端使用', 'info', 2000);
            return;
        }

        // TODO: 实现横屏/竖屏切换逻辑
        // 可以通过CSS类或screen.orientation API实现
        window.showToast('横屏功能开发中...', 'info', 1500);
    };

    // ===== 事件注册 =====
    function registerMobileEvents() {
        log('EVENTS', '注册移动端专属事件');

        // 使用单独的事件监听器，避免与PC事件冲突
        document.addEventListener('click', function(e) {
            var target = e.target.closest('[data-action]');
            if (!target) return;

            var action = target.getAttribute('data-action');

            // 只处理移动端专属事件（前缀为mobile-）
            if (action.indexOf('mobile-') !== 0 && action !== 'toggle-mobile-sidebar' && action !== 'toggle-mobile-mail-detail') {
                return; // 忽略非移动端事件
            }

            log('EVENTS', '触发移动端事件:', action);

            switch (action) {
                case 'toggle-mobile-sidebar':
                    e.preventDefault();
                    e.stopPropagation(); // 防止冒泡到PC事件处理器
                    window.toggleMobileSidebar();
                    break;
                case 'toggle-mobile-mail-detail':
                    e.preventDefault();
                    e.stopPropagation();
                    window.toggleMobileMailDetail();
                    break;
                case 'toggle-orientation':
                    e.preventDefault();
                    e.stopPropagation();
                    window.toggleOrientation();
                    break;
                default:
                    log('EVENTS', '⚠️ 未知的移动端事件:', action);
            }
        });

        // 遮罩层点击事件（单独注册）
        document.addEventListener('click', handleOverlayClick);

        log('EVENTS', '✅ 事件注册完成');
    }

    // ===== 公开API =====
    window.isMobileMode = function() {
        return _isMobile;
    };

    window.getMobileBreakpoint = function() {
        return MOBILE_BREAKPOINT;
    };

    // ===== 自动初始化 =====
    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();