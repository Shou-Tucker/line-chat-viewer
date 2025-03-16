// アバター管理とカスタマイズ関連の機能

// グローバル変数が初期化されるまで待機
window.addEventListener('DOMContentLoaded', function() {
    // ページ要素
    const avatarSettingsToggle = document.getElementById('avatar-settings-toggle');
    const avatarSettingsPanel = document.getElementById('avatar-settings-panel');
    const avatarList = document.getElementById('avatar-list');
    const closeAvatarSettings = document.getElementById('close-avatar-settings');
    const clearAvatars = document.getElementById('clear-avatars');
    const storageUsed = document.getElementById('storage-used');
    const storageText = document.getElementById('storage-text');
    
    // アバターマネージャのグローバル公開
    window.avatarManager = {
        updateAvatarSettings,
        saveUserSettings,
        updateStorageUsage,
        toggleAvatarSettings,
        closeAvatarSettingsPanel,
        clearAllAvatars
    };
    
    // イベントリスナーの設定
    avatarSettingsToggle.addEventListener('click', toggleAvatarSettings);
    closeAvatarSettings.addEventListener('click', closeAvatarSettingsPanel);
    clearAvatars.addEventListener('click', clearAllAvatars);
    
    // アバター設定パネルの表示/非表示
    function toggleAvatarSettings() {
        if (avatarSettingsPanel.classList.contains('hidden')) {
            updateAvatarSettings();
            avatarSettingsPanel.classList.remove('hidden');
        } else {
            avatarSettingsPanel.classList.add('hidden');
        }
    }

    // アバター設定パネルを閉じる
    function closeAvatarSettingsPanel() {
        avatarSettingsPanel.classList.add('hidden');
    }

    // ユーザー設定を保存する
    function saveUserSettings() {
        try {
            localStorage.setItem('lineViewerSettings', JSON.stringify(window.lineViewer.userSettings));
            // ストレージ使用量を更新
            updateStorageUsage();
        } catch (err) {
            console.error('設定の保存に失敗しました:', err);
            alert('設定の保存に失敗しました。ブラウザのストレージ容量が不足している可能性があります。');
        }
    }
    
    // ストレージ使用量を更新
    function updateStorageUsage() {
        try {
            // ローカルストレージの最大容量（ブラウザによって異なる、約5MB）
            const maxStorage = 5 * 1024 * 1024;
            
            // 現在の使用量を計算
            let currentUsage = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    currentUsage += localStorage[key].length * 2; // UTF-16なので2倍
                }
            }
            
            // 使用率を計算
            const usagePercentage = Math.min(100, Math.round((currentUsage / maxStorage) * 100));
            
            // UIを更新
            storageUsed.style.width = `${usagePercentage}%`;
            storageText.textContent = `ストレージ使用量: ${usagePercentage}%`;
            
            // 警告表示
            if (usagePercentage > 80) {
                storageUsed.classList.add('storage-warning');
            } else {
                storageUsed.classList.remove('storage-warning');
            }
        } catch (err) {
            console.error('ストレージ使用量の計算に失敗しました:', err);
        }
    }

    // ユーザー別のアバター設定を更新
    function updateAvatarSettings() {
        // ユーザー名の一覧を取得（重複を排除）
        const usernames = new Set();
        window.lineViewer.rawMessages.forEach(msg => {
            if (msg.type === 'message') {
                usernames.add(msg.name);
            }
        });
        
        // アバター設定リストをクリア
        avatarList.innerHTML = '';
        
        // ユーザーごとの設定を作成
        usernames.forEach(username => {
            const avatarItem = document.createElement('div');
            avatarItem.className = 'avatar-item';
            
            // 色を取得
            const userColor = window.lineViewer.userSettings.colors[username] || window.lineViewer.colorPool[window.lineViewer.colorIndex % window.lineViewer.colorPool.length];
            window.lineViewer.userSettings.colors[username] = userColor;
            
            // アバタープレビュー
            const avatarPreview = document.createElement('div');
            avatarPreview.className = 'avatar-preview';
            avatarPreview.style.backgroundColor = userColor;
            avatarPreview.textContent = username.charAt(0);
            
            // 画像URLがある場合は背景画像として設定
            if (window.lineViewer.userSettings.avatarUrls[username]) {
                avatarPreview.style.backgroundImage = `url(${window.lineViewer.userSettings.avatarUrls[username]})`;
                avatarPreview.classList.add('with-image');
            }
            
            // ユーザー名
            const nameSpan = document.createElement('span');
            nameSpan.className = 'avatar-name';
            nameSpan.textContent = username;
            
            // 色選択
            const colorPicker = document.createElement('div');
            colorPicker.className = 'avatar-color-picker';
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = userColor;
            colorInput.addEventListener('change', function() {
                window.lineViewer.userSettings.colors[username] = this.value;
                avatarPreview.style.backgroundColor = this.value;
                saveUserSettings();
                window.messageRenderer.renderVisibleMessages();
            });
            
            // 画像アップロードボタン
            const imageUpload = document.createElement('input');
            imageUpload.type = 'file';
            imageUpload.accept = 'image/*';
            imageUpload.id = `avatar-upload-${username.replace(/\s/g, '-')}`;
            imageUpload.className = 'avatar-upload';
            imageUpload.style.display = 'none';
            
            const imageLabel = document.createElement('label');
            imageLabel.htmlFor = imageUpload.id;
            imageLabel.className = 'avatar-upload-label';
            imageLabel.textContent = '画像';
            
            // 画像削除ボタン
            const removeButton = document.createElement('button');
            removeButton.className = 'avatar-remove-button small-button';
            removeButton.textContent = '削除';
            removeButton.style.display = window.lineViewer.userSettings.avatarUrls[username] ? 'inline-block' : 'none';
            
            // 画像アップロード処理
            imageUpload.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        // 画像をリサイズ
                        resizeImage(e.target.result, 100, 100, function(resizedImage) {
                            // リサイズした画像を保存
                            window.lineViewer.userSettings.avatarUrls[username] = resizedImage;
                            
                            // プレビューを更新
                            avatarPreview.style.backgroundImage = `url(${resizedImage})`;
                            avatarPreview.classList.add('with-image');
                            
                            // 削除ボタンを表示
                            removeButton.style.display = 'inline-block';
                            
                            // 設定を保存
                            saveUserSettings();
                            
                            // メッセージを再レンダリング
                            window.messageRenderer.renderVisibleMessages();
                        });
                    };
                    
                    reader.readAsDataURL(this.files[0]);
                }
            });
            
            // 画像削除処理
            removeButton.addEventListener('click', function() {
                // 画像設定を削除
                delete window.lineViewer.userSettings.avatarUrls[username];
                
                // プレビューを更新
                avatarPreview.style.backgroundImage = '';
                avatarPreview.classList.remove('with-image');
                
                // 削除ボタンを非表示
                this.style.display = 'none';
                
                // 設定を保存
                saveUserSettings();
                
                // メッセージを再レンダリング
                window.messageRenderer.renderVisibleMessages();
            });
            
            // 要素を追加
            colorPicker.appendChild(colorInput);
            avatarItem.appendChild(avatarPreview);
            avatarItem.appendChild(nameSpan);
            avatarItem.appendChild(colorPicker);
            avatarItem.appendChild(imageLabel);
            avatarItem.appendChild(imageUpload);
            avatarItem.appendChild(removeButton);
            
            avatarList.appendChild(avatarItem);
        });
    }

    // 画像をリサイズする関数
    function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
        const img = new Image();
        img.onload = function() {
            // 元のサイズを保持
            let width = img.width;
            let height = img.height;
            
            // アスペクト比を維持しながらリサイズ
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            // リサイズ用のキャンバスを作成
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // 画像を描画
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // リサイズした画像のDataURLを返す
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(resizedDataUrl);
        };
        
        img.src = dataUrl;
    }

    // 全てのアバター画像をクリア
    function clearAllAvatars() {
        if (confirm('全てのアイコン画像をリセットしますか？この操作は元に戻せません。')) {
            window.lineViewer.userSettings.avatarUrls = {};
            saveUserSettings();
            
            // アバター設定パネルを更新
            updateAvatarSettings();
            
            // メッセージを再レンダリング
            window.messageRenderer.renderVisibleMessages();
        }
    }
});