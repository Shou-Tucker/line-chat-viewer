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

    // 初期化時に自動的にイベントリスナーを設定
    setupEventListeners();
    console.log('FileHandler: イベントリスナーを設定しました');

    // イベントリスナーの設定
    function setupEventListeners() {
        // ファイル選択
        fileInput.addEventListener('change', handleFileSelect);
        console.log('FileHandler: ファイル選択イベントリスナーを設定しました');
        
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
        console.log('FileHandler: ドラッグ＆ドロップイベントリスナーを設定しました');
        
        // 読み込みボタン
        loadButton.addEventListener('click', loadFile);
        console.log('FileHandler: 読み込みボタンイベントリスナーを設定しました');
    }

    // ドロップエリアハイライト
    function highlight(e) {
        preventDefaults(e);
        dropArea.classList.add('highlight');
    }

    function unhighlight(e) {
        preventDefaults(e);
        dropArea.classList.remove('highlight');
    }

    // ファイルドロップ処理
    function handleDrop(e) {
        preventDefaults(e);
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
        console.log('FileHandler: ファイルが選択されました');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;
            loadButton.disabled = false;
            console.log('FileHandler: ファイル名を表示しました:', file.name);
        } else {
            fileNameDisplay.textContent = 'ファイルが選択されていません';
            loadButton.disabled = true;
            console.log('FileHandler: ファイルが選択されていません');
        }
    }

    // ファイルを読み込む
    function loadFile() {
        console.log('FileHandler: ファイル読み込み開始');
        if (fileInput.files.length === 0) {
            console.error('FileHandler: ファイルが選択されていません');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        // 読み込み開始
        loadingDiv.classList.remove('hidden');
        loadButton.disabled = true;
        loadingStatus.textContent = 'ファイルを読み込んでいます...';
        console.log('FileHandler: 読み込み表示を開始しました');
        
        reader.onload = function(e) {
            try {
                console.log('FileHandler: ファイルの読み込みが完了しました');
                const text = e.target.result;
                
                // ローメモリーモードの場合は、分割して処理
                if (lowMemoryModeCheckbox.checked) {
                    console.log('FileHandler: ローメモリーモードでパース開始');
                    parseInChunks(text);
                } else {
                    // 通常モードの場合は、メインスレッドでパース
                    console.log('FileHandler: 通常モードでパース開始');
                    if (!window.parserManager) {
                        console.error('FileHandler: parserManager が見つかりません');
                        alert('Parser モジュールが読み込まれていません。ページを再読み込みしてください。');
                        loadingDiv.classList.add('hidden');
                        loadButton.disabled = false;
                        return;
                    }
                    window.lineViewer.rawMessages = window.parserManager.parseLINEChat(text);
                    finishLoading();
                }
            } catch (error) {
                console.error('FileHandler: エラーが発生しました:', error);
                alert('ファイルの処理中にエラーが発生しました: ' + error.message);
                loadingDiv.classList.add('hidden');
                loadButton.disabled = false;
            }
        };
        
        reader.onerror = function() {
            console.error('FileHandler: ファイル読み込みエラー');
            alert('ファイルの読み込み中にエラーが発生しました。');
            loadingDiv.classList.add('hidden');
            loadButton.disabled = false;
        };
        
        console.log('FileHandler: ファイル読み込み開始 -', file.name);
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
        console.log('FileHandler: 読み込み完了');
        loadingStatus.textContent = 'メッセージを表示しています...';
        
        // メッセージの表示順を設定
        if (reverseOrderCheckbox.checked) {
            console.log('FileHandler: メッセージを逆順に設定');
            window.lineViewer.rawMessages.reverse();
        }
        
        // 各メッセージに一意のIDとグローバルインデックスを付与
        window.lineViewer.rawMessages.forEach((msg, index) => {
            msg.id = 'msg-' + index;
            msg.globalIndex = index;
        });
        
        // ユーザー別のアバター設定を更新
        if (window.avatarManager) {
            window.avatarManager.updateAvatarSettings();
        } else {
            console.error('FileHandler: avatarManager が見つかりません');
        }
        
        // 最初のチャンクを表示
        if (window.coreManager) {
            window.coreManager.resetDisplay();
            window.coreManager.loadInitialMessages();
        } else {
            console.error('FileHandler: coreManager が見つかりません');
            alert('Core モジュールが読み込まれていません。ページを再読み込みしてください。');
            loadingDiv.classList.add('hidden');
            loadButton.disabled = false;
            return;
        }
        
        // UI表示の更新
        chatContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        chatTitle.textContent = fileInput.files[0].name.replace('.txt', '');
        console.log('FileHandler: UIを更新しました');
    }

    // グローバルに公開する関数
    window.fileHandler = {
        setupEventListeners,
        handleFileSelect,
        loadFile,
        handleDrop,
        highlight,
        unhighlight,
        preventDefaults
    };
    
    console.log('FileHandler: モジュールの初期化が完了しました');
});