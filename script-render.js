// メッセージレンダリング関連の機能
window.addEventListener('DOMContentLoaded', function() {
    console.log('Renderer: 初期化を開始します');
    
    // ページ要素
    const chatMessages = document.getElementById('chat-messages');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const myUsernameInput = document.getElementById('my-username');
    
    // 初期化
    if (!window.lineViewer) {
        console.error('Renderer: lineViewer が初期化されていません');
        window.lineViewer = {};
    }
    
    // messageIndexMap がなければ初期化
    if (!window.lineViewer.messageIndexMap) {
        console.log('Renderer: messageIndexMap を初期化します');
        window.lineViewer.messageIndexMap = new Map();
    }
    
    // レンダラーのグローバル公開
    window.messageRenderer = {
        renderMessages,
        renderVisibleMessages
    };
    console.log('Renderer: グローバル関数を公開しました');
    
    // ユーザー名から色を取得
    function getUserColor(username) {
        if (!window.lineViewer.userSettings || !window.lineViewer.userSettings.colors) {
            console.error('Renderer: userSettings が初期化されていません');
            window.lineViewer.userSettings = { colors: {}, avatarUrls: {} };
        }
        
        if (!window.lineViewer.userSettings.colors[username]) {
            if (!window.lineViewer.colorPool) {
                console.error('Renderer: colorPool が初期化されていません');
                window.lineViewer.colorPool = [
                    '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
                    '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
                ];
                window.lineViewer.colorIndex = 0;
            }
            
            window.lineViewer.userSettings.colors[username] = window.lineViewer.colorPool[window.lineViewer.colorIndex % window.lineViewer.colorPool.length];
            window.lineViewer.colorIndex++;
            
            // 設定を保存
            if (window.avatarManager && window.avatarManager.saveUserSettings) {
                window.avatarManager.saveUserSettings();
            } else {
                console.error('Renderer: avatarManager.saveUserSettings が利用できません');
            }
        }
        return window.lineViewer.userSettings.colors[username];
    }
    
    // ユーザー名からアバターイニシャルを取得
    function getUserInitial(username) {
        return username.charAt(0);
    }
    
    // メッセージを表示する関数
    function renderMessages(messages, replace = false) {
        console.log('Renderer: メッセージをレンダリングします', { count: messages.length, replace });
        
        if (replace) {
            chatMessages.innerHTML = '';
            window.lineViewer.visibleMessages = [];
        }
        
        if (!messages || messages.length === 0) {
            console.warn('Renderer: レンダリングするメッセージがありません');
            return;
        }
        
        // 既存のメッセージに新しいメッセージを追加
        window.lineViewer.visibleMessages = window.lineViewer.visibleMessages.concat(messages);
        
        const fragment = document.createDocumentFragment();
        
        // 自分のユーザー名設定
        const myUsernameList = myUsernameInput.value
            ? myUsernameInput.value.split(',').map(name => name.trim())
            : [];
        
        messages.forEach((msg) => {
            if (!msg) {
                console.error('Renderer: メッセージが undefined です');
                return;
            }
            
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
                
                if (msg.id) {
                    systemDiv.setAttribute('data-id', msg.id);
                }
                
                fragment.appendChild(systemDiv);
            } else if (msg.type === 'message') {
                // メッセージの向きを決定（自分のメッセージは右側に）
                const isMyMessage = myUsernameList.length > 0 && myUsernameList.some(name => 
                    msg.name === name || 
                    msg.name.includes(name)
                );
                const messageClass = isMyMessage ? 'message right' : 'message left';
                
                // メッセージ要素の作成
                const messageDiv = document.createElement('div');
                messageDiv.className = messageClass;
                
                if (msg.id) {
                    messageDiv.setAttribute('data-id', msg.id);
                    
                    // インデックスマップに追加
                    if (msg.globalIndex !== undefined) {
                        // messageIndexMap が確実に初期化されていることを確認
                        if (!window.lineViewer.messageIndexMap) {
                            window.lineViewer.messageIndexMap = new Map();
                        }
                        window.lineViewer.messageIndexMap.set(msg.id, msg.globalIndex);
                    }
                }
                
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
                
                // 画像URLがある場合は背景画像として設定
                if (window.lineViewer.userSettings && 
                    window.lineViewer.userSettings.avatarUrls && 
                    window.lineViewer.userSettings.avatarUrls[msg.name]) {
                    avatarDiv.style.backgroundImage = `url(${window.lineViewer.userSettings.avatarUrls[msg.name]})`;
                    avatarDiv.classList.add('with-image');
                }
                
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
        
        // スクロール位置の調整
        if (replace) {
            chatMessages.scrollTop = reverseOrderCheckbox.checked ? 0 : chatMessages.scrollHeight;
        } else if (!reverseOrderCheckbox.checked) {
            // 追加読み込み時は、位置維持のスクロール操作なし
        }
        
        console.log('Renderer: メッセージレンダリングが完了しました');
    }
    
    // 表示中のメッセージを再レンダリング
    function renderVisibleMessages() {
        renderMessages(window.lineViewer.visibleMessages, true);
    }
    
    console.log('Renderer: モジュールの初期化が完了しました');
});