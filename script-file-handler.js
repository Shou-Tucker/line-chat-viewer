// ファイル処理関連のモジュール
window.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const loadButton = document.getElementById('load-button');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const lowMemoryModeCheckbox = document.getElementById('low-memory-mode');
    const loadingDiv = document.getElementById('loading');
    const loadingStatus = document.getElementById('loading-status');
    const chatContainer = document.getElementById('chat-container');
    const chatTitle = document.getElementById('chat-title');
    const dropArea = document.getElementById('drop-area');

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
                    window.lineViewer.rawMessages = window.parserManager.parseLINEChat(text);
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
            const parsedChunk = window.parserManager.parseChunk(chunk, processedLines > 0);
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

    // 読み込み完了後の処理
    function finishLoading() {
        loadingStatus.textContent = 'メッセージを表示しています...';
        
        // メッセージの表示順を設定
        if (reverseOrderCheckbox.checked) {
            window.lineViewer.rawMessages.reverse();
        }
        
        // 各メッセージに一意のIDとグローバルインデックスを付与
        window.lineViewer.rawMessages.forEach((msg, index) => {
            msg.id = 'msg-' + index;
            msg.globalIndex = index;
        });
        
        // ユーザー別のアバター設定を更新
        window.avatarManager.updateAvatarSettings();
        
        // 最初のチャンクを表示
        window.coreManager.resetDisplay();
        window.coreManager.loadInitialMessages();
        
        // UI表示の更新
        chatContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        chatTitle.textContent = fileInput.files[0].name.replace('.txt', '');
    }

    // グローバルに公開する関数
    window.fileHandler = {
        setupEventListeners,
        handleFileSelect,
        loadFile
    };
});