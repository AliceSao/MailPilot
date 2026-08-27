/**
 * app.js - 应用核心入口（精简版）
 * 
 * 功能（仅保留）：
 * - 日志分级系统
 * - 应用初始化
 * - 移动端检测
 * - 调试工具
 * 
 * 已拆分模块：
 * - api.js    → API调用 + 数据管理 + 后端同步
 * - ui.js     → 模态框 + Toast + Loading + 主题 + 内容切换
 * - table.js  → 表格渲染 + 搜索筛选分页 + 统计
 * - events.js → 事件委托 + 键盘快捷键 + 侧边栏控制
 * 
 * 加载顺序：i18n.js → app.js → api.js → ui.js → table.js → events.js → mail.js → batch.js → mobile.js
 */

console.log('[App] ✅ app.js 开始加载...');

(function () {
    'use strict';

    // ===== 日志分级系统 =====
    var LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', SUCCESS: 'SUCCESS' };
    var LOG_COLORS = {
        INFO: '#6B7280',
        WARN: '#F59E0B',
        ERROR: '#EF4444',
        SUCCESS: '#10B981'
    };

    function log(level, module, message) {
        var color = LOG_COLORS[level] || LOG_COLORS.INFO;
        var prefix = '%c[' + level + '] [' + module + ']';
        var style = 'color:' + color + ';font-weight:bold;';

        switch(level) {
            case LOG_LEVELS.ERROR:
                console.error(prefix, style, message);
                break;
            case LOG_LEVELS.WARN:
                console.warn(prefix, style, message);
                break;
            default:
                console.log(prefix, style, message);
        }
    }

    window.appLog = log;
    window.LOG_LEVELS = LOG_LEVELS;

    log(LOG_LEVELS.SUCCESS, 'App', '日志系统初始化完成');
    console.log('[App] ✅ IIFE 执行开始...');

    // ===== 移动端检测 =====
    function detectMobile() {
        var isMobile = window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            document.body.classList.add('mobile-mode');
            log(LOG_LEVELS.INFO, '移动端', '检测到移动设备，启用移动端模式');
        } else {
            document.body.classList.remove('mobile-mode');
        }

        return isMobile;
    }

    window.detectMobile = detectMobile;

    // 监听窗口大小变化
    window.addEventListener('resize', function() {
        detectMobile();
    });

    // ===== 初始化 =====
    // 🔴 关键修复：init()不能在app.js的IIFE内立即执行！
    // 因为app.js先于ui.js/table.js加载，此时window.loadHTMLParts等函数还未定义
    // 必须等所有脚本加载完成后，由index.html底部的bootstrap脚本调用
    window.initApp = async function init() {
        try {
            log(LOG_LEVELS.INFO, '初始化', '===== 应用初始化开始 =====');

            // 1. 加载HTML片段
            log(LOG_LEVELS.INFO, '初始化', '加载HTML片段...');
            if (window.loadHTMLParts) {
                await window.loadHTMLParts();
                log(LOG_LEVELS.SUCCESS, '初始化', 'HTML片段加载完成');
            } else {
                log(LOG_LEVELS.ERROR, '初始化', '❌ window.loadHTMLParts 未定义！ui.js可能未加载');
            }

            // 2. 绑定DOM事件
            log(LOG_LEVELS.INFO, '初始化', '绑定DOM事件...');
            if (window.bindSelectAllEvent) window.bindSelectAllEvent();

            // 3. 检查分组数据
            if (!localStorage.getItem('emailGroups')) {
                localStorage.setItem('emailGroups', JSON.stringify(['默认分组']));
            }

            // 4. 加载主题
            log(LOG_LEVELS.INFO, '初始化', '加载主题...');
            if (window.loadTheme) {
                window.loadTheme();
            } else {
                log(LOG_LEVELS.ERROR, '初始化', '❌ window.loadTheme 未定义！ui.js可能未加载');
            }

            // 5. 从后端加载数据
            log(LOG_LEVELS.INFO, '初始化', '从后端加载数据...');
            if (window.loadFromBackend) window.loadFromBackend();

            // 6. 渲染表格
            log(LOG_LEVELS.INFO, '初始化', '渲染表格...');
            if (window.loadData) {
                window.loadData();
            } else {
                log(LOG_LEVELS.ERROR, '初始化', '❌ window.loadData 未定义！table.js可能未加载');
            }

            // 7. 更新时间
            if (window.updateTime) window.updateTime();
            setInterval(function() {
                if (window.updateTime) window.updateTime();
            }, 60000);

            // 8. 检查到期警告
            if (window.checkExpiryWarnings) setTimeout(window.checkExpiryWarnings, 3000);

            // 9. 应用语言
            if (window.applyLanguage) window.applyLanguage();

            // 10. 检测移动端
            log(LOG_LEVELS.INFO, '初始化', '检测移动端...');
            detectMobile();

            // 11. 初始化事件系统
            if (window.initEvents) window.initEvents();

            // 12. 检查侧边栏状态
            log(LOG_LEVELS.INFO, '初始化', '检查侧边栏状态...');
            var sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (sidebarCollapsed) {
                var sidebarEl = document.querySelector('.main-layout .sidebar');
                if (sidebarEl) {
                    sidebarEl.classList.add('collapsed');
                    sidebarEl.style.width = '0';
                    sidebarEl.style.minWidth = '0';
                    sidebarEl.style.maxWidth = '0';
                    sidebarEl.style.padding = '0';
                    sidebarEl.style.overflow = 'hidden';
                    sidebarEl.style.borderRight = 'none';

                    var mainLayout = document.querySelector('.main-layout');
                    if (mainLayout) {
                        mainLayout.style.gridTemplateColumns = '0 1fr';
                    }

                    var hamburgerIcon = document.getElementById('hamburger-icon');
                    if (hamburgerIcon) hamburgerIcon.className = 'fas fa-arrow-right';
                }
            }

            // 13. 初始化内容区（默认显示邮箱管理）
            log(LOG_LEVELS.INFO, '初始化', '初始化内容区（默认显示邮箱管理）...');
            if (window.switchContentSection) window.switchContentSection('emails');

            log(LOG_LEVELS.SUCCESS, '初始化', '✅ 所有步骤完成，移除js-hide类');
            document.body.classList.remove('js-hide');

        } catch(e) {
            log(LOG_LEVELS.ERROR, '初始化', '❌ 发生错误: ' + e.message);
            log(LOG_LEVELS.ERROR, '初始化', '错误堆栈: ' + e.stack);

            if (window.showErrorPage) {
                window.showErrorPage(e);
            } else {
                document.body.classList.remove('js-hide');
            }
        }
    };

})();

// ⚠️ toggleSidebar已移至events.js（从备份提取，行1548-1555）
// 此处保留注释提醒，避免重复定义

// ===== 调试工具（生产环境可删除）=====
var THEMES = ['theme-default', 'theme-dark', 'theme-starry', 'theme-dusk'];
var THEME_NAMES = ['默认', '深色', '星空', '黄昏'];

window.debugThemes = function() {
    console.log('\n%c===== 🎨 主题调试工具 =====', 'font-size:16px; color:#3498db; font-weight:bold;');
    console.log('当前body类名:', document.body.className);
    console.log('localStorage主题:', localStorage.getItem('theme'));
    console.log('\n可用主题列表（共' + THEMES.length + '个）:');
    THEMES.forEach(function(theme, idx) {
        var isActive = document.body.classList.contains(theme) ? '✅ 当前' : '';
        console.log('  [' + idx + '] ' + theme + ' → ' + THEME_NAMES[idx] + ' ' + isActive);
    });
    console.log('\n快速测试命令:');
    console.log('  forceSetTheme("theme-default")   // 切换到默认主题');
    console.log('  forceSetTheme("theme-dark")      // 切换到深色主题');
    console.log('  forceSetTheme("theme-starry")    // 切换到星空主题');
    console.log('  forceSetTheme("theme-dusk")      // 切换到黄昏主题');
    console.log('  cycleTheme()                     // 循环切换到下一个主题');
    console.log('  debugResetTheme()                // 重置缓存并刷新页面\n');
};

window.debugSetTheme = function(idx) {
    if (idx < 0 || idx >= THEMES.length) {
        console.error('❌ 无效索引，请使用0-' + (THEMES.length - 1));
        return;
    }
    var theme = THEMES[idx];
    return window.forceSetTheme ? window.forceSetTheme(theme) : null;
};

window.debugResetTheme = function() {
    console.log('[调试] 重置主题为默认值...');
    localStorage.removeItem('theme');
    location.reload();
};

// 页面加载完成后输出调试提示
setTimeout(function() {
    console.log('%c🎨 MailPilot UI调试系统已加载！', 'font-size:14px; color:#27ae60; font-weight:bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#27ae60;');
    console.log('%c📋 主题相关:', 'font-weight:bold; color:#e67e22;');
    console.log('  debugThemes()              查看当前主题状态和4个可用主题');
    console.log('  debugSetTheme(0-3)         快速切换主题（0=默认/1=深色/2=星空/3=黄昏）');
    console.log('  forceSetTheme("theme-xxx") 强制设置指定主题');
    console.log('  cycleTheme()               循环切换到下一个主题');
    console.log('  debugResetTheme()          清除主题缓存并刷新');
    console.log('%c📋 布局相关:', 'font-weight:bold; color:#e67e22;');
    console.log('  switchContentSection("emails")  切换到邮箱管理界面');
    console.log('  switchContentSection("groups")  切换到分组管理界面');
    console.log('%c📋 文件结构（从备份100%提取）:', 'font-weight:bold; color:#27ae60;');
    console.log('  app.js   (245行)  → 入口+日志+初始化');
    console.log('  api.js   (197行)  → API调用+数据读写+后端同步 ✅已提取');
    console.log('  ui.js    (652行)  → 模态框+Toast+Loading+主题+HTML片段加载 ✅已提取');
    console.log('  table.js (409行)  → 表格渲染+搜索筛选分页+统计 ✅已提取');
    console.log('  events.js(311行)  → 事件委托+键盘快捷键+侧边栏控制 ✅已提取');
    console.log('  mail.js  (~400行) → 邮件操作+Token管理');
    console.log('  batch.js (~630行) → 批量操作+分组管理+导入导出');
    console.log('  mobile.js(~350行) → 移动端专用逻辑');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color:#27ae60;');
}, 1000);