document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const loadButton = document.getElementById('load-button');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const dateFormatSelect = document.getElementById('date-format');
    const myUsernameInput = document.getElementById('my-username');
    const chunkSizeSelect = document.getElementById('chunk-size');
    const lowMemoryModeCheckbox = document.getElementById('low-memory-mode');
    const loadingDiv = document.getElementById('loading');
    const loadingStatus = document.getElementById('loading-status');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const backButton = document.getElementById('back-button');
    const chatTitle = document.getElementById('chat-title');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchPrevButton = document.getElementById('search-prev');
    const searchNextButton = document.getElementById('search-next');
    const searchStats = document.getElementById('search-stats');
    const dropArea = document.getElementById('drop-area');
    const loadMoreButton = document.getElementById('load-more-button');
    const scrollLoading = document.getElementById('scroll-loading');

    // 共有変数の定義（グローバルアクセス用）
    window.lineViewer = {
        // 状態変数
        rawMessages: [], // パース済みの全メッセージ
        visibleMessages: [], // 現在表示中のメッセージ
        currentStartIndex: 0, // 現在表示中のメッセージの開始インデックス
        searchResults: [], // 検索結果
        currentSearchIndex: -1, // 現在の検索結果インデックス
        isLoading: false, // 読み込み中フラグ
        hasReachedEnd: false, // 全てのメッセージを表示したかどうか
        userSettings: {
            colors: {}, // ユーザー名と色のマッピング
            avatarUrls: {} // ユーザー名とアバター画像URLのマッピング
        },
        colorPool: [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
            '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
        ],
        colorIndex: 0
    };

    // 初期化処理
    initializeApp();

    // アプリの初期化
    function initializeApp() {
        // localStorage からユーザー設定を読み込む
        loadUserSettings();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // ストレージ使用量の表示
        window.avatarManager.updateStorageUsage();
    }

    // ユーザー設定を読み込む
    function loadUserSettings() {
        try {
            const savedSettings = localStorage.getItem('lineViewerSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                window.lineViewer.userSettings = {
                    ...window.lineViewer.userSettings,
                    ...parsed
                };
            }
        } catch (err) {
            console.error('設定の読み込みに失敗しました:', err);
            // エラー時は初期設定を使用
            window.lineViewer.userSettings = {
                colors: {},
                avatarUrls: {}
            };
        }
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // ファイル選択
        fileInput.addEventListener('change', handleFileSelect);
        
        // ドラッグ＆ドロップ関連
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        // 読み込みボタン
        loadButton.addEventListener('click', loadFile);
        
        // 戻るボタン
        backButton.addEventListener('click', goBack);
        
        // 検索関連
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
        
        searchButton.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
        
        searchPrevButton.addEventListener('click', function() {
            navigateSearch(-1);
        });
        
        searchNextButton.addEventListener('click', function() {
            navigateSearch(1);
        });
        
        // ページング関連
        loadMoreButton.addEventListener('click', loadMoreMessages);
        
        // スクロールイベント（無限スクロール）
        chatMessages.addEventListener('scroll', handleScroll);
        
        // 設定変更時
        myUsernameInput.addEventListener('change', function() {
            // 表示中のメッセージを再レンダリング
            if (window.lineViewer.visibleMessages.length > 0) {
                window.messageRenderer.renderVisibleMessages();
            }
        });
    }

    // ドロップエリアハイライト
    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // ファイルドロップ処理
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && (files[0].type === 'text/plain' || files[0].name.endsWith('.txt'))) {
            fileInput.files = files;
            handleFileSelect();
        } else {
            alert('テキストファイル(.txt)を選択してください');
        }
    }

    // デフォルト動作防止
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ファイル選択時の処理
    function handleFileSelect() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;
            loadButton.disabled = false;
        } else {
            fileNameDisplay.textContent = 'ファイルが選択されていません';
            loadButton.disabled = true;
        }
    }

    // ファイルを読み込む
    function loadFile() {
        if (fileInput.files.length === 0) return;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        // 読み込み開始
        loadingDiv.classList.remove('hidden');
        loadButton.disabled = true;
        loadingStatus.textContent = 'ファイルを読み込んでいます...';
        
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                
                // ローメモリーモードの場合は、分割して処理
                if (lowMemoryModeCheckbox.checked) {
                    parseInChunks(text);
                } else {
                    // 通常モードの場合は、メインスレッドでパース
                    window.lineViewer.rawMessages = parseLINEChat(text);
                    finishLoading();
                }
            } catch (error) {
                console.error('エラーが発生しました:', error);
                alert('ファイルの処理中にエラーが発生しました: ' + error.message);
                loadingDiv.classList.add('hidden');
                loadButton.disabled = false;
            }
        };
        
        reader.onerror = function() {
            alert('ファイルの読み込み中にエラーが発生しました。');
            loadingDiv.classList.add('hidden');
            loadButton.disabled = false;
        };
        
        reader.readAsText(file, 'utf-8');
    }

    // テキストを分割して処理（メモリ使用量削減のため）
    function parseInChunks(text) {
        // テキストを行ごとに分割
        const lines = text.split(/\r?\n/);
        const totalLines = lines.length;
        
        // 読み込み状況の更新
        loadingStatus.textContent = `パース中... (0/${totalLines} 行)`;
        
        // 1チャンクあたりの行数
        const chunkSize = 1000;
        let processedLines = 0;
        window.lineViewer.rawMessages = [];
        
        // Web Worker を使用せず、setTimeout で非同期処理
        processNextChunk();
        
        function processNextChunk() {
            // 処理するチャンクの範囲を決定
            const endIndex = Math.min(processedLines + chunkSize, totalLines);
            const chunk = lines.slice(processedLines, endIndex);
            
            // このチャンクを処理
            const parsedChunk = parseChunk(chunk, processedLines > 0);
            window.lineViewer.rawMessages = window.lineViewer.rawMessages.concat(parsedChunk);
            
            // 進捗状況の更新
            processedLines = endIndex;
            const percentage = Math.round((processedLines / totalLines) * 100);
            loadingStatus.textContent = `パース中... (${processedLines}/${totalLines} 行, ${percentage}%)`;
            
            // 次のチャンクがあればそれを処理、なければ完了
            if (processedLines < totalLines) {
                setTimeout(processNextChunk, 0); // 次のチャンクを非同期で処理
            } else {
                // 全チャンクの処理が完了
                finishLoading();
            }
        }
    }

    // 一連のテキスト行をパースする
    function parseChunk(lines, isContinuation) {
        // メッセージの格納用配列
        const messages = [];
        let currentDate = null;
        let currentMessage = null;
        
        // 行を解析してメッセージを抽出
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;
            
            // 日付行の判定（「2023年4月1日（土）」や「2023/4/1」などの形式）
            const dateMatch = line.match(/^\[?(\d{4}[年\/\-]\s*\d{1,2}[月\/\-]\s*\d{1,2}[日]?)(\s*\(\S+\))?\]?$/);
            if (dateMatch) {
                currentDate = formatDate(dateMatch[1]);
                messages.push({
                    type: 'date',
                    date: currentDate
                });
                continue;
            }
            
            // メッセージ行の判定（「12:34 ユーザー名 メッセージ」の形式）
            const messageMatch = line.match(/^\[?(\d{1,2}:\d{2})\]?\s+(.+?)\s+(.+)$/);
            if (messageMatch) {
                const time = messageMatch[1];
                const name = messageMatch[2].replace(':', '').trim();
                
                // メッセージ内容を取得
                let content = messageMatch[3].trim();
                
                currentMessage = {
                    type: 'message',
                    time: time,
                    name: name,
                    content: content,
                    isMultiLine: false
                };
                messages.push(currentMessage);
                continue;
            }
            
            // システムメッセージの判定
            const systemMessageMatch = line.match(/^\[?(\d{1,2}:\d{2})\]?\s+(.+)$/);
            if (systemMessageMatch && !line.includes('招待しました') && !line.includes('参加しました') && (line.includes('ノート') || line.includes('アルバム'))) {
                messages.push({
                    type: 'system',
                    time: systemMessageMatch[1],
                    content: systemMessageMatch[2]
                });
                continue;
            }
            
            // 前のメッセージの続きと判断（インデントや改行後のテキストなど）
            if (currentMessage) {
                currentMessage.content += '\n' + line;
                currentMessage.isMultiLine = true;
            }
        }
        
        // 文頭と文末の引用符を処理
        messages.forEach(msg => {
            if (msg.type === 'message') {
                let content = msg.content;
                
                // 先頭と末尾の引用符を削除
                if (content.startsWith('"') && content.endsWith('"')) {
                    content = content.substring(1, content.length - 1);
                    msg.content = content;
                } else if (msg.isMultiLine) {
                    // 複数行の場合、最初の行の先頭と最後の行の末尾のみチェック
                    const lines = content.split('\n');
                    let modified = false;
                    
                    if (lines[0].startsWith('"')) {
                        lines[0] = lines[0].substring(1);
                        modified = true;
                    }
                    
                    const lastIdx = lines.length - 1;
                    if (lines[lastIdx].endsWith('"')) {
                        lines[lastIdx] = lines[lastIdx].substring(0, lines[lastIdx].length - 1);
                        modified = true;
                    }
                    
                    if (modified) {
                        msg.content = lines.join('\n');
                    }
                }
            }
        });
        
        return messages;
    }

    // 読み込み完了後の処理
    function finishLoading() {
        loadingStatus.textContent = 'メッセージを表示しています...';
        
        // メッセージの表示順を設定
        if (reverseOrderCheckbox.checked) {
            window.lineViewer.rawMessages.reverse();
        }
        
        // ユーザー別のアバター設定を更新
        window.avatarManager.updateAvatarSettings();
        
        // 最初のチャンクを表示
        resetDisplay();
        loadInitialMessages();
        
        // UI表示の更新
        chatContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        chatTitle.textContent = fileInput.files[0].name.replace('.txt', '');
    }

    // メッセージ表示をリセット
    function resetDisplay() {
        chatMessages.innerHTML = '';
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.visibleMessages = [];
        window.lineViewer.hasReachedEnd = false;
        clearSearch();
    }

    // 初期メッセージを読み込む
    function loadInitialMessages() {
        if (window.lineViewer.rawMessages.length === 0) {
            chatMessages.innerHTML = '<div class="no-messages">メッセージが見つかりませんでした</div>';
            return;
        }
        
        loadMoreMessages(true);
        
        // さらに読み込むボタンの表示状態を更新
        updateLoadMoreButton();
    }

    // さらにメッセージを読み込む
    function loadMoreMessages(isInitial = false) {
        if (window.lineViewer.isLoading || window.lineViewer.hasReachedEnd) return;
        
        window.lineViewer.isLoading = true;
        const chunkSize = parseInt(chunkSizeSelect.value, 10);
        
        // 初回表示でなければローディング表示
        if (!isInitial) {
            scrollLoading.classList.remove('hidden');
        }
        
        // 次のチャンクのメッセージを取得
        const endIndex = Math.min(window.lineViewer.currentStartIndex + chunkSize, window.lineViewer.rawMessages.length);
        const newMessages = window.lineViewer.rawMessages.slice(window.lineViewer.currentStartIndex, endIndex);
        
        // メッセージをレンダリング（setTimeout で処理を分散）
        setTimeout(() => {
            // メッセージを追加
            window.messageRenderer.renderMessages(newMessages, isInitial);
            
            // 状態を更新
            window.lineViewer.currentStartIndex = endIndex;
            window.lineViewer.hasReachedEnd = window.lineViewer.currentStartIndex >= window.lineViewer.rawMessages.length;
            
            // UI更新
            updateLoadMoreButton();
            scrollLoading.classList.add('hidden');
            window.lineViewer.isLoading = false;
        }, 10);
    }

    // さらに読み込むボタンの表示状態を更新
    function updateLoadMoreButton() {
        if (window.lineViewer.hasReachedEnd) {
            loadMoreButton.classList.add('hidden');
        } else {
            loadMoreButton.classList.remove('hidden');
        }
    }

    // スクロールイベントハンドラ（無限スクロール用）
    function handleScroll() {
        // ローメモリーモードで無限スクロールを無効化
        if (lowMemoryModeCheckbox.checked) return;
        
        if (window.lineViewer.isLoading || window.lineViewer.hasReachedEnd) return;
        
        const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
        const scrollHeight = chatMessages.scrollHeight;
        
        // スクロール位置が下部に近づいたら追加読み込み
        if (scrollHeight - scrollPosition < 200) {
            loadMoreMessages();
        }
    }

    // 検索実行関数
    function performSearch(query) {
        // 前回の検索結果をクリア
        clearSearch();
        
        if (!query || query.length < 2) return;
        
        // メッセージ要素を全て取得
        const allMessages = document.querySelectorAll('.message-content');
        
        // 検索文字列で一致する要素を探す
        for (let i = 0; i < allMessages.length; i++) {
            const messageContent = allMessages[i].textContent;
            if (messageContent.toLowerCase().includes(query.toLowerCase())) {
                window.lineViewer.searchResults.push(allMessages[i].closest('.message'));
                
                // ハイライト処理
                const regex = new RegExp(escapeRegExp(query), 'gi');
                allMessages[i].innerHTML = allMessages[i].textContent.replace(
                    regex, 
                    match => `<span class="highlight">${match}</span>`
                );
            }
        }
        
        // 検索結果があれば最初の結果に移動
        if (window.lineViewer.searchResults.length > 0) {
            window.lineViewer.currentSearchIndex = 0;
            highlightCurrentResult();
            updateSearchStats();
            // 検索ナビゲーションボタンを有効化
            searchPrevButton.disabled = false;
            searchNextButton.disabled = false;
        } else {
            searchStats.textContent = '0 件';
            // 検索ナビゲーションボタンを無効化
            searchPrevButton.disabled = true;
            searchNextButton.disabled = true;
        }
    }
    
    // 検索ナビゲーション関数
    function navigateSearch(direction) {
        if (window.lineViewer.searchResults.length === 0) return;
        
        // 現在のハイライトを解除
        if (window.lineViewer.currentSearchIndex >= 0) {
            window.lineViewer.searchResults[window.lineViewer.currentSearchIndex].classList.remove('current-search-result');
        }
        
        // インデックスを更新（循環させる）
        window.lineViewer.currentSearchIndex = (window.lineViewer.currentSearchIndex + direction + window.lineViewer.searchResults.length) % window.lineViewer.searchResults.length;
        
        // 新しい結果をハイライト
        highlightCurrentResult();
        updateSearchStats();
    }
    
    // 現在の検索結果をハイライト
    function highlightCurrentResult() {
        if (window.lineViewer.currentSearchIndex >= 0 && window.lineViewer.currentSearchIndex < window.lineViewer.searchResults.length) {
            const currentElement = window.lineViewer.searchResults[window.lineViewer.currentSearchIndex];
            currentElement.classList.add('current-search-result');
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // 検索状態表示を更新
    function updateSearchStats() {
        searchStats.textContent = `${window.lineViewer.currentSearchIndex + 1}/${window.lineViewer.searchResults.length} 件`;
    }
    
    // 検索状態をクリア
    function clearSearch() {
        // ハイライトを解除
        const highlightedElements = document.querySelectorAll('.highlight');
        highlightedElements.forEach(el => {
            const parent = el.parentNode;
            parent.textContent = parent.textContent;
        });
        
        // 現在の結果ハイライトを解除
        const currentResults = document.querySelectorAll('.current-search-result');
        currentResults.forEach(el => el.classList.remove('current-search-result'));
        
        // 検索状態リセット
        window.lineViewer.searchResults = [];
        window.lineViewer.currentSearchIndex = -1;
        searchStats.textContent = '';
        
        // ナビゲーションボタンを無効化
        searchPrevButton.disabled = true;
        searchNextButton.disabled = true;
    }
    
    // LINE履歴をパースして構造化する関数
    function parseLINEChat(text) {
        // 必要に応じて文字コード修正
        text = fixTextEncoding(text);
        
        // 改行で分割して行ごとに処理
        const lines = text.split(/\r?\n/);
        
        return parseChunk(lines, false);
    }

    // 文字化けの修正関数
    function fixTextEncoding(text) {
        // 特定の文字化けパターンの修正
        return text
            .replace(/\u{FFFD}/gu, '') // 不明な文字を削除
            .replace(/\ufffd/g, '') // UTF-8誤変換文字を削除
            .replace(/\u00ef?\u00bf?\u00bd/g, '') // UTF-8誤変換文字を削除
            .replace(/\u00e3/g, 'ア') // カタカナの修正例
            .replace(/\u00e2/g, '→');  // 矢印の修正例
    }

    // 日付の表示形式を変換する関数
    function formatDate(dateStr) {
        // 日付文字列から年、月、日を抽出
        const dateMatch = dateStr.match(/(\d{4})[年\/\-]\s*(\d{1,2})[月\/\-]\s*(\d{1,2})[日]?/);
        if (!dateMatch) return dateStr;
        
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        
        // 選択されたフォーマットに応じて日付を整形
        const format = dateFormatSelect.value;
        switch (format) {
            case 'yyyy/MM/dd':
                return `${year}/${month}/${day}`;
            case 'yyyy年MM月dd日':
                return `${year}年${month}月${day}日`;
            case 'MM/dd/yyyy':
                return `${month}/${day}/${year}`;
            default:
                return `${year}/${month}/${day}`;
        }
    }

    // 戻るボタンの処理
    function goBack() {
        chatContainer.classList.add('hidden');
        loadButton.disabled = false;
        chatMessages.innerHTML = '';
        // 検索状態をリセット
        clearSearch();
        // 状態変数をリセット
        window.lineViewer.rawMessages = [];
        window.lineViewer.visibleMessages = [];
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.hasReachedEnd = false;
    }

    // 正規表現用エスケープ関数
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ユーティリティ関数をグローバルに公開
    window.lineViewer.utils = {
        formatDate,
        fixTextEncoding,
        escapeRegExp
    };
});