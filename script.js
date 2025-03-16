document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const loadButton = document.getElementById('load-button');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const dateFormatSelect = document.getElementById('date-format');
    const usernameOptions = document.getElementById('username-options');
    const loadingDiv = document.getElementById('loading');
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

    // 現在のメッセージリスト（ユーザー名変更時に再レンダリングするため）
    let currentMessages = [];
    
    // 選択されたユーザー（自分）の名前
    let selectedUserName = null;

    // ユーザー名と色のマッピング
    const userColors = {};
    const colorPool = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
        '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
    ];
    let colorIndex = 0;

    // 検索関連の変数
    let searchResults = [];
    let currentSearchIndex = -1;

    // ドラッグアンドドロップ関連の処理
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && files[0].type === 'text/plain' || files[0].name.endsWith('.txt')) {
            fileInput.files = files;
            handleFileSelect();
        } else {
            alert('テキストファイル(.txt)を選択してください');
        }
    }

    // ファイル選択時の処理
    fileInput.addEventListener('change', handleFileSelect);

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

    // 「読み込む」ボタンのクリック時の処理
    loadButton.addEventListener('click', function() {
        if (fileInput.files.length === 0) return;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        // 読み込み開始時
        loadingDiv.classList.remove('hidden');
        loadButton.disabled = true;
        
        reader.onload = function(e) {
            const text = e.target.result;
            currentMessages = parseLINEChat(text);
            
            // ユーザー名の抽出
            const usernames = extractUsernames(currentMessages);
            createUsernameOptions(usernames);
            
            renderMessages(currentMessages);
            loadingDiv.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            chatTitle.textContent = file.name.replace('.txt', '');
        };
        
        reader.onerror = function() {
            alert('ファイルの読み込み中にエラーが発生しました。');
            loadingDiv.classList.add('hidden');
            loadButton.disabled = false;
        };
        
        reader.readAsText(file, 'utf-8');
    });

    // メッセージからユーザー名を抽出
    function extractUsernames(messages) {
        const usernameSet = new Set();
        
        // デフォルトのユーザー名を追加
        const defaultNames = ["あなた", "You", "(あなた)", "（あなた）"];
        defaultNames.forEach(name => usernameSet.add(name));
        
        // メッセージからユーザー名を追加
        messages.forEach(msg => {
            if (msg.type === 'message' && msg.name) {
                usernameSet.add(msg.name);
            }
        });
        
        return Array.from(usernameSet);
    }
    
    // ユーザー名選択ラジオボタンの作成
    function createUsernameOptions(usernames) {
        usernameOptions.innerHTML = '';
        
        usernames.forEach((username, index) => {
            const isDefault = ["あなた", "You", "(あなた)", "（あなた）"].includes(username);
            
            const radioOption = document.createElement('div');
            radioOption.className = 'radio-option' + (isDefault ? ' selected' : '');
            radioOption.dataset.username = username;
            
            // アバターの最初の文字を取得（日本語の場合も1文字）
            const initial = username.charAt(0);
            
            radioOption.innerHTML = `
                <input type="radio" name="username" id="username-${index}" value="${username}" ${isDefault ? 'checked' : ''}>
                <label for="username-${index}">${username}</label>
            `;
            
            radioOption.addEventListener('click', function() {
                // 選択状態の更新
                document.querySelectorAll('.radio-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // ラジオボタンを選択状態に
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // 選択されたユーザー名を保存
                selectedUserName = username;
                
                // メッセージの再レンダリング
                renderMessages(currentMessages);
            });
            
            usernameOptions.appendChild(radioOption);
            
            // デフォルトで最初のデフォルトユーザー名を選択
            if (isDefault && selectedUserName === null) {
                selectedUserName = username;
            }
        });
    }

    // 「戻る」ボタンのクリック時の処理
    backButton.addEventListener('click', function() {
        chatContainer.classList.add('hidden');
        loadButton.disabled = false;
        chatMessages.innerHTML = '';
        // 検索状態をリセット
        clearSearch();
        // 現在のメッセージリストとユーザー名選択をクリア
        currentMessages = [];
        selectedUserName = null;
        usernameOptions.innerHTML = '';
    });

    // 検索関連のイベント
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
                searchResults.push(allMessages[i].closest('.message'));
                
                // ハイライト処理
                const regex = new RegExp(escapeRegExp(query), 'gi');
                allMessages[i].innerHTML = allMessages[i].textContent.replace(
                    regex, 
                    match => `<span class="highlight">${match}</span>`
                );
            }
        }
        
        // 検索結果があれば最初の結果に移動
        if (searchResults.length > 0) {
            currentSearchIndex = 0;
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
        if (searchResults.length === 0) return;
        
        // 現在のハイライトを解除
        if (currentSearchIndex >= 0) {
            searchResults[currentSearchIndex].classList.remove('current-search-result');
        }
        
        // インデックスを更新（循環させる）
        currentSearchIndex = (currentSearchIndex + direction + searchResults.length) % searchResults.length;
        
        // 新しい結果をハイライト
        highlightCurrentResult();
        updateSearchStats();
    }
    
    // 現在の検索結果をハイライト
    function highlightCurrentResult() {
        if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
            const currentElement = searchResults[currentSearchIndex];
            currentElement.classList.add('current-search-result');
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // 検索状態表示を更新
    function updateSearchStats() {
        searchStats.textContent = `${currentSearchIndex + 1}/${searchResults.length} 件`;
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
        searchResults = [];
        currentSearchIndex = -1;
        searchStats.textContent = '';
        
        // ナビゲーションボタンを無効化
        searchPrevButton.disabled = true;
        searchNextButton.disabled = true;
    }
    
    // 正規表現用エスケープ関数
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // LINE履歴をパースして構造化する関数
    function parseLINEChat(text) {
        // 必要に応じて文字コード修正
        text = fixTextEncoding(text);
        
        // 改行で分割して行ごとに処理
        const lines = text.split(/\r?\n/);
        
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
                    isMultiLine: false,
                    rawContent: content // 元のコンテンツを保存
                };
                messages.push(currentMessage);
                continue;
            }
            
            // システムメッセージの判定（「○○さんが「○○」というノートを作成しました。」など）
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
                currentMessage.rawContent += '\n' + line; // 元のコンテンツも更新
            }
        }
        
        // 文頭と文末の引用符を処理
        messages.forEach(msg => {
            if (msg.type === 'message') {
                let content = msg.content;
                
                // 先頭と末尾の引用符を削除（単一行と複数行の両方に対応）
                if (content.startsWith('"') && content.endsWith('"')) {
                    content = content.substring(1, content.length - 1);
                    msg.content = content;
                } else if (msg.isMultiLine) {
                    // 複数行の場合、最初の行の先頭と最後の行の末尾のみチェック
                    const lines = content.split('\n');
                    let modified = false;
                    
                    // 最初の行が引用符で始まっていれば削除
                    if (lines[0].startsWith('"')) {
                        lines[0] = lines[0].substring(1);
                        modified = true;
                    }
                    
                    // 最後の行が引用符で終わっていれば削除
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
        
        // メッセージの表示順を設定（チェックボックスに応じて）
        if (reverseOrderCheckbox.checked) {
            messages.reverse();
        }
        
        return messages;
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

    // ユーザー名から色を取得
    function getUserColor(username) {
        if (!userColors[username]) {
            userColors[username] = colorPool[colorIndex % colorPool.length];
            colorIndex++;
        }
        return userColors[username];
    }
    
    // ユーザー名からアバターイニシャルを取得
    function getUserInitial(username) {
        return username.charAt(0);
    }

    // メッセージを表示する関数
    function renderMessages(messages) {
        chatMessages.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // ユーザー名と色のマッピング
        userColors = {};
        colorIndex = 0;
        
        // デフォルトの「自分」判定用名前リスト
        const defaultUsernames = ["あなた", "You", "(あなた)", "（あなた）"];
        const myUsernameList = selectedUserName ? [selectedUserName] : defaultUsernames;
        
        messages.forEach((msg, index) => {
            if (msg.type === 'date') {
                // 日付の表示
                const dateDiv = document.createElement('div');
                dateDiv.className = 'message-date';
                dateDiv.textContent = msg.date;
                fragment.appendChild(dateDiv);
            } else if (msg.type === 'system') {
                // システムメッセージの表示
                const systemDiv = document.createElement('div');
                systemDiv.className = 'system-message';
                systemDiv.textContent = `${msg.time} ${msg.content}`;
                fragment.appendChild(systemDiv);
            } else if (msg.type === 'message') {
                // メッセージの向きを決定（自分のメッセージは右側に）
                const isMyMessage = myUsernameList.some(name => 
                    msg.name === name || 
                    msg.name.includes(name)
                );
                const messageClass = isMyMessage ? 'message right' : 'message left';
                
                // メッセージ要素の作成
                const messageDiv = document.createElement('div');
                messageDiv.className = messageClass;
                
                // ユーザー名の色とイニシャル
                const userColor = getUserColor(msg.name);
                const userInitial = getUserInitial(msg.name);
                
                // 名前の表示（自分以外）
                if (!isMyMessage) {
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'message-name';
                    nameDiv.textContent = msg.name;
                    nameDiv.style.color = userColor;
                    messageDiv.appendChild(nameDiv);
                }
                
                // メッセージコンテナ（吹き出し部分）
                const containerDiv = document.createElement('div');
                containerDiv.className = 'message-container';
                
                // アバター表示
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                avatarDiv.style.backgroundColor = userColor;
                avatarDiv.textContent = userInitial;
                containerDiv.appendChild(avatarDiv);
                
                // メッセージ内容
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                if (msg.isMultiLine) {
                    const contentLines = msg.content.split('\n');
                    contentLines.forEach((line, i) => {
                        if (i > 0) contentDiv.appendChild(document.createElement('br'));
                        contentDiv.appendChild(document.createTextNode(line));
                    });
                } else {
                    contentDiv.textContent = msg.content;
                }
                containerDiv.appendChild(contentDiv);
                messageDiv.appendChild(containerDiv);
                
                // 時間の表示
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = msg.time;
                messageDiv.appendChild(timeDiv);
                
                fragment.appendChild(messageDiv);
            }
        });
        
        chatMessages.appendChild(fragment);
        chatMessages.scrollTop = reverseOrderCheckbox.checked ? 0 : chatMessages.scrollHeight;
        
        // 検索状態をリセット
        clearSearch();
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
            // 必要に応じて追加のパターンを追加
    }
});