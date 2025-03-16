// メッセージレンダリング関連の機能
window.addEventListener('DOMContentLoaded', function() {
    // ページ要素
    const chatMessages = document.getElementById('chat-messages');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const myUsernameInput = document.getElementById('my-username');
    
    // メッセージをレンダリングする関数
    function renderMessages(messages, replace = false) {
        if (replace) {
            chatMessages.innerHTML = '';
            window.lineViewer.visibleMessages = [];
        }
        
        // 既存のメッセージに新しいメッセージを追加
        window.lineViewer.visibleMessages = window.lineViewer.visibleMessages.concat(messages);
        
        const fragment = document.createDocumentFragment();
        
        // 自分のユーザー名設定
        const myUsernameList = myUsernameInput.value
            ? myUsernameInput.value.split(',').map(name => name.trim())
            : [];
        
        messages.forEach((msg) => {
            if (msg.type === 'date') {
                // 日付の表示
                const dateDiv = document.createElement('div');
                dateDiv.className = 'message-date';
                dateDiv.textContent = msg.date;
                dateDiv.setAttribute('data-id', msg.id);
                fragment.appendChild(dateDiv);
            } else if (msg.type === 'system') {
                // システムメッセージの表示
                const systemDiv = document.createElement('div');
                systemDiv.className = 'system-message';
                systemDiv.textContent = `${msg.time} ${msg.content}`;
                systemDiv.setAttribute('data-id', msg.id);
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
                messageDiv.setAttribute('data-id', msg.id);
                
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
                if (window.lineViewer.userSettings.avatarUrls[msg.name]) {
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
                
                // メッセージIDとDOMノードの関連付け
                window.lineViewer.messageIndexMap.set(msg.id, messageDiv);
                
                fragment.appendChild(messageDiv);
            }
        });
        
        chatMessages.appendChild(fragment);
        
        // スクロール位置の調整
        if (replace) {
            chatMessages.scrollTop = reverseOrderCheckbox.checked ? 0 : chatMessages.scrollHeight;
        } else if (!reverseOrderCheckbox.checked) {
            // 追加読み込み時は、現在位置を維持
        }
    }
    
    // 表示中のメッセージを再レンダリング
    function renderVisibleMessages() {
        renderMessages(window.lineViewer.visibleMessages, true);
    }
    
    // ユーザー名から色を取得
    function getUserColor(username) {
        if (!window.lineViewer.userSettings.colors[username]) {
            window.lineViewer.userSettings.colors[username] = window.lineViewer.colorPool[window.lineViewer.colorIndex % window.lineViewer.colorPool.length];
            window.lineViewer.colorIndex++;
            // 設定を保存
            window.avatarManager.saveUserSettings();
        }
        return window.lineViewer.userSettings.colors[username];
    }
    
    // ユーザー名からアバターイニシャルを取得
    function getUserInitial(username) {
        return username.charAt(0);
    }
    
    // レンダラーのグローバル公開
    window.messageRenderer = {
        renderMessages,
        renderVisibleMessages
    };
});