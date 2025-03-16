document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const loadButton = document.getElementById('load-button');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const dateFormatSelect = document.getElementById('date-format');
    const loadingDiv = document.getElementById('loading');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const backButton = document.getElementById('back-button');
    const chatTitle = document.getElementById('chat-title');

    // ファイル選択時の処理
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            const file = this.files[0];
            fileNameDisplay.textContent = file.name;
            loadButton.disabled = false;
        } else {
            fileNameDisplay.textContent = 'ファイルが選択されていません';
            loadButton.disabled = true;
        }
    });

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
            processLINEChat(text);
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

    // 「戻る」ボタンのクリック時の処理
    backButton.addEventListener('click', function() {
        chatContainer.classList.add('hidden');
        loadButton.disabled = false;
        chatMessages.innerHTML = '';
    });

    // LINE履歴のパース・表示処理
    function processLINEChat(text) {
        // 必要に応じて文字コード修正
        text = fixTextEncoding(text);
        
        // チャットメッセージをクリア
        chatMessages.innerHTML = '';
        
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
                const content = messageMatch[3].trim();
                
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
            }
        }
        
        // メッセージの表示順を設定（チェックボックスに応じて）
        if (reverseOrderCheckbox.checked) {
            messages.reverse();
        }
        
        // メッセージの表示
        renderMessages(messages);
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

    // メッセージを表示する関数
    function renderMessages(messages) {
        const fragment = document.createDocumentFragment();
        
        // ユーザー名と色のマッピング
        const userColors = {};
        const colorPool = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
            '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
        ];
        let colorIndex = 0;
        
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
                // ユーザー名に色を割り当て
                if (!userColors[msg.name]) {
                    userColors[msg.name] = colorPool[colorIndex % colorPool.length];
                    colorIndex++;
                }
                
                // メッセージの向きを決定（自分のメッセージは右側に）
                const isMyMessage = msg.name === "あなた" || msg.name === "You" || msg.name.includes("（あなた）");
                const messageClass = isMyMessage ? 'message right' : 'message left';
                
                // メッセージ要素の作成
                const messageDiv = document.createElement('div');
                messageDiv.className = messageClass;
                
                // 名前の表示（自分以外）
                if (!isMyMessage) {
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'message-name';
                    nameDiv.textContent = msg.name;
                    nameDiv.style.color = userColors[msg.name];
                    messageDiv.appendChild(nameDiv);
                }
                
                // メッセージコンテナ（吹き出し部分）
                const containerDiv = document.createElement('div');
                containerDiv.className = 'message-container';
                
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