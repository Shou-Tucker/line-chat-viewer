// メッセージレンダリング関数の定義
// script.jsの続き

// メッセージを表示する関数の続き
function renderMessages(messages) {
    chatMessages.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    // 自分のユーザー名設定
    const myUsernameList = userSettings.myUsername 
        ? userSettings.myUsername.split(',').map(name => name.trim())
        : [];
    
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
            const isMyMessage = myUsernameList.length > 0 && myUsernameList.some(name => 
                msg.name === name || 
                msg.name.includes(name)
            );
            const messageClass = isMyMessage ? 'message right' : 'message left';
            
            // メッセージ要素の作成
            const messageDiv = document.createElement('div');
            messageDiv.className = messageClass;
            
            // ユーザー名の色とイニシャル
            const userColor = userSettings.colors[msg.name] || '#CCCCCC';
            const userInitial = msg.name.charAt(0);
            
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
            if (userSettings.avatarUrls[msg.name]) {
                avatarDiv.style.backgroundImage = `url(${userSettings.avatarUrls[msg.name]})`;
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