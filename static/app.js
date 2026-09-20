/**
 * YouTube Playlist Link Extractor - Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const playlistUrlInput = document.getElementById('playlistUrl');
    const extractBtn = document.getElementById('extractBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loadingState = document.getElementById('loadingState');
    const errorCard = document.getElementById('errorCard');
    const errorMessage = document.getElementById('errorMessage');
    const dismissError = document.getElementById('dismissError');
    const resultSection = document.getElementById('resultSection');

    // Result summary elements
    const playlistTitle = document.getElementById('playlistTitle');
    const channelNameText = document.getElementById('channelNameText');
    const videoCountBadge = document.getElementById('videoCountBadge');
    const linksOutput = document.getElementById('linksOutput');
    const linkStats = document.getElementById('linkStats');
    const displayFormatName = document.getElementById('displayFormatName');

    // Actions
    const copyAllBtn = document.getElementById('copyAllBtn');
    const quickCopyBtn = document.getElementById('quickCopyBtn');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const reverseOrderBtn = document.getElementById('reverseOrderBtn');

    // Views & Toggles
    const viewTextBtn = document.getElementById('viewTextBtn');
    const viewGridBtn = document.getElementById('viewGridBtn');
    const textView = document.getElementById('textView');
    const gridView = document.getElementById('gridView');
    const formatChips = document.querySelectorAll('.format-chip');

    // History
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const historyChevron = document.getElementById('historyChevron');
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    const historyCountBadge = document.getElementById('historyCountBadge');

    // Toast
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // Application State
    let currentData = null;
    let currentVideos = [];
    let currentFormat = 'plain';
    let isReversed = false;
    let toastTimeout = null;

    // Initialize
    loadHistory();
    refreshIcons();

    // Event: Input input
    playlistUrlInput.addEventListener('input', () => {
        if (playlistUrlInput.value.trim().length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    });

    // Event: Clear button
    clearBtn.addEventListener('click', () => {
        playlistUrlInput.value = '';
        clearBtn.classList.add('hidden');
        playlistUrlInput.focus();
    });

    // Event: Paste button
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                playlistUrlInput.value = text.trim();
                clearBtn.classList.remove('hidden');
                playlistUrlInput.focus();
            }
        } catch (err) {
            showToast('Không thể đọc clipboard. Vui lòng dán thủ công (Ctrl+V).');
        }
    });

    // Event: Enter key on input
    playlistUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performExtraction();
        }
    });

    // Event: Extract button
    extractBtn.addEventListener('click', performExtraction);

    // Event: Sample chip click
    document.querySelectorAll('.sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const sampleUrl = chip.getAttribute('data-url');
            playlistUrlInput.value = sampleUrl;
            clearBtn.classList.remove('hidden');
            performExtraction();
        });
    });

    // Event: Dismiss error
    dismissError.addEventListener('click', () => {
        errorCard.classList.add('hidden');
    });

    // Format selector change
    formatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            formatChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const radio = chip.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            currentFormat = chip.getAttribute('data-format');
            updateFormattedOutput();
        });
    });

    // View toggles (Text vs Grid)
    viewTextBtn.addEventListener('click', () => {
        viewTextBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        textView.classList.remove('hidden');
        gridView.classList.add('hidden');
    });

    viewGridBtn.addEventListener('click', () => {
        viewGridBtn.classList.add('active');
        viewTextBtn.classList.remove('active');
        gridView.classList.remove('hidden');
        textView.classList.add('hidden');
    });

    // Copy actions
    copyAllBtn.addEventListener('click', copyAllLinks);
    quickCopyBtn.addEventListener('click', copyAllLinks);

    // Download TXT
    downloadTxtBtn.addEventListener('click', () => {
        if (!currentVideos.length) return;
        const content = generateOutputText(currentVideos, currentFormat);
        const filename = sanitizeFilename(currentData?.playlist_title || 'youtube_links') + '.txt';
        triggerDownload(content, filename, 'text/plain;charset=utf-8');
        showToast(`Đã tải file ${filename}`);
    });

    // Download CSV
    downloadCsvBtn.addEventListener('click', () => {
        if (!currentVideos.length) return;
        const csvRows = ['STT,Tiêu đề,Link,Thời lượng,Kênh'];
        currentVideos.forEach(v => {
            const safeTitle = `"${(v.title || '').replace(/"/g, '""')}"`;
            const safeChannel = `"${(v.channel || '').replace(/"/g, '""')}"`;
            csvRows.push(`${v.index},${safeTitle},${v.url},${v.duration || ''},${safeChannel}`);
        });
        const content = "\uFEFF" + csvRows.join('\n'); // UTF-8 BOM for Excel
        const filename = sanitizeFilename(currentData?.playlist_title || 'youtube_links') + '.csv';
        triggerDownload(content, filename, 'text/csv;charset=utf-8');
        showToast(`Đã xuất file CSV thành công`);
    });

    // Reverse order
    reverseOrderBtn.addEventListener('click', () => {
        if (!currentVideos.length) return;
        isReversed = !isReversed;
        currentVideos.reverse();
        updateFormattedOutput();
        renderGridView(currentVideos);
        showToast(isReversed ? 'Đã đảo ngược thứ tự (mới nhất trước)' : 'Đã trả về thứ tự ban đầu');
    });

    // History Toggle
    toggleHistoryBtn.addEventListener('click', () => {
        historyList.classList.toggle('hidden');
        historyChevron.classList.toggle('rotated');
    });

    // Main Extraction Function
    async function performExtraction() {
        const url = playlistUrlInput.value.trim();
        if (!url) {
            showError('Vui lòng nhập đường dẫn hoặc ID của playlist YouTube.');
            playlistUrlInput.focus();
            return;
        }

        // Reset UI
        errorCard.classList.add('hidden');
        resultSection.classList.add('hidden');
        loadingState.classList.remove('hidden');
        setLoadingState(true);

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Có lỗi xảy ra khi trích xuất playlist.');
            }

            // Success
            currentData = data;
            currentVideos = [...data.videos];
            isReversed = false;

            displayResults(data);
            saveToHistory(data, url);

        } catch (err) {
            showError(err.message || 'Không thể kết nối đến máy chủ.');
        } finally {
            loadingState.classList.add('hidden');
            setLoadingState(false);
        }
    }

    function displayResults(data) {
        playlistTitle.textContent = data.playlist_title || 'YouTube Playlist';
        channelNameText.textContent = data.channel || 'Kênh YouTube';
        videoCountBadge.textContent = `${data.total} Video`;

        updateFormattedOutput();
        renderGridView(data.videos);

        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        refreshIcons();
    }

    function updateFormattedOutput() {
        if (!currentVideos || currentVideos.length === 0) return;
        const text = generateOutputText(currentVideos, currentFormat);
        linksOutput.value = text;
        linkStats.textContent = `${currentVideos.length} link`;

        const formatLabels = {
            'markdown': 'Định dạng: [URL](URL)',
            'plain': 'Định dạng: URL Thuần',
            'numbered': 'Định dạng: 1. URL',
            'title_markdown': 'Định dạng: [Tiêu đề](URL)',
            'title_plain': 'Định dạng: Tiêu đề - URL'
        };
        displayFormatName.textContent = formatLabels[currentFormat] || 'Định dạng Link';
    }

    function generateOutputText(videos, format) {
        return videos.map((v, i) => {
            const idx = i + 1;
            const url = v.url;
            const title = v.title || `Video #${idx}`;
            switch (format) {
                case 'markdown':
                    return `[${url}](${url})`;
                case 'plain':
                    return url;
                case 'numbered':
                    return `${idx}. ${url}`;
                case 'title_markdown':
                    return `[${idx}. ${title}](${url})`;
                case 'title_plain':
                    return `${idx}. ${title} - ${url}`;
                default:
                    return `[${url}](${url})`;
            }
        }).join('\n');
    }

    function renderGridView(videos) {
        gridView.innerHTML = '';
        videos.forEach((v, i) => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <div class="video-thumb-container">
                    <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" class="video-thumb" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
                    <span class="video-index-badge">#${i + 1}</span>
                    ${v.duration ? `<span class="video-duration-badge">${escapeHtml(v.duration)}</span>` : ''}
                </div>
                <div class="video-card-body">
                    <h3 class="video-card-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</h3>
                    <div class="video-card-footer">
                        <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer" class="video-link-btn">
                            <i data-lucide="external-link"></i>
                            <span>Xem trên YouTube</span>
                        </a>
                        <button type="button" class="video-copy-btn" title="Sao chép link này" data-url="${escapeHtml(v.url)}">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                </div>
            `;

            // Copy single link button
            const singleCopyBtn = card.querySelector('.video-copy-btn');
            singleCopyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyTextToClipboard(v.url);
                showToast(`Đã chép link video #${i + 1}`);
            });

            gridView.appendChild(card);
        });
        refreshIcons();
    }

    async function copyAllLinks() {
        const text = linksOutput.value;
        if (!text) return;
        await copyTextToClipboard(text);
        showToast(`Đã sao chép toàn bộ ${currentVideos.length} link vào bộ nhớ tạm!`);
    }

    async function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older context
            linksOutput.select();
            document.execCommand('copy');
        }
    }

    function showToast(msg) {
        if (toastTimeout) clearTimeout(toastTimeout);
        toastMessage.textContent = msg;
        toast.classList.remove('hidden');
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3200);
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorCard.classList.remove('hidden');
        errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setLoadingState(isLoading) {
        extractBtn.disabled = isLoading;
        const content = extractBtn.querySelector('.btn-content');
        const loader = extractBtn.querySelector('.btn-loader');
        if (isLoading) {
            content.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            content.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    function triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function sanitizeFilename(name) {
        return name.replace(/[\\/*?:"<>|]/g, '_').trim().slice(0, 50);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function refreshIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Local Storage History Management
    const HISTORY_KEY = 'yt_playlist_extractor_history';

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveToHistory(data, originalUrl) {
        let history = getHistory();
        // Remove existing item with same playlist url/title
        history = history.filter(item => item.url !== originalUrl && item.title !== data.playlist_title);
        // Add new item to front
        history.unshift({
            title: data.playlist_title,
            channel: data.channel,
            total: data.total,
            url: originalUrl,
            timestamp: new Date().toLocaleString('vi-VN')
        });
        // Keep max 10 items
        if (history.length > 10) history.pop();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        loadHistory();
    }

    function loadHistory() {
        const history = getHistory();
        historyCountBadge.textContent = history.length;
        if (history.length === 0) {
            historyEmpty.classList.remove('hidden');
            return;
        }

        historyEmpty.classList.add('hidden');
        // Clear previous except empty msg
        const items = historyList.querySelectorAll('.history-item');
        items.forEach(el => el.remove());

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-left">
                    <span class="history-item-title">${escapeHtml(item.title)}</span>
                    <span class="history-item-meta">${item.total} video • ${escapeHtml(item.channel)} • ${item.timestamp}</span>
                </div>
                <button type="button" class="btn-micro" title="Tải lại playlist này">
                    <i data-lucide="rotate-cw"></i>
                    <span>Tải lại</span>
                </button>
            `;
            div.addEventListener('click', () => {
                playlistUrlInput.value = item.url;
                clearBtn.classList.remove('hidden');
                performExtraction();
            });
            historyList.appendChild(div);
        });
        refreshIcons();
    }
});
