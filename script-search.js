// 検索関連のモジュール
window.addEventListener('DOMContentLoaded', function() {
    // 検索UI要素
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchPrevButton = document.getElementById('search-prev');
    const searchNextButton = document.getElementById('search-next');
    const searchStats = document.getElementById('search-stats');
    const searchInfoText = document.getElementById('search-info-text');

    // イベントリスナーの設定
    setupEventListeners();

    function setupEventListeners() {
        // 検索関連のイベント設定
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
    }

    // 検索実行関数
    function performSearch(query, isAppendSearch = false) {
        if (!query || query.length < 2) {
            clearSearch();
            return;
        }
        
        // 同じクエリなら再検索しない（追加読み込み時を除く）
        if (query === window.lineViewer.lastSearchQuery && !isAppendSearch) {
            return;
        }
        
        // 検索クエリを保存
        window.lineViewer.lastSearchQuery = query;
        
        // 前回の検索結果をクリア（追加読み込み時以外）
        if (!isAppendSearch) {
            clearSearch();
        }
        
        // 現在表示中のDOMから検索
        const visibleResultElements = findInVisibleDOM(query);
        
        // 全メッセージ内の検索位置を取得
        const allResultIndices = findInAllMessages(query);
        
        // UIの更新
        updateSearchUI(visibleResultElements.length, allResultIndices.length);
    }
    
    // 表示中のDOM要素から検索
    function findInVisibleDOM(query) {
        const results = [];
        
        // メッセージ要素を全て取得
        const allMessages = document.querySelectorAll('.message-content');
        
        // 検索文字列で一致する要素を探す
        for (let i = 0; i < allMessages.length; i++) {
            const messageContent = allMessages[i].textContent;
            if (messageContent.toLowerCase().includes(query.toLowerCase())) {
                const messageElement = allMessages[i].closest('.message');
                results.push(messageElement);
                
                // ハイライト処理
                const regex = new RegExp(window.parserManager.escapeRegExp(query), 'gi');
                allMessages[i].innerHTML = allMessages[i].textContent.replace(
                    regex, 
                    match => `<span class="highlight">${match}</span>`
                );
                
                // 検索結果配列に追加
                window.lineViewer.searchResults.push(messageElement);
                
                // メッセージのID取得
                const messageId = messageElement.getAttribute('data-id');
                if (messageId) {
                    // 全メッセージ内でのインデックスを取得
                    const msgObj = window.lineViewer.rawMessages.find(m => m.id === messageId);
                    if (msgObj && msgObj.globalIndex !== undefined) {
                        window.lineViewer.searchResultIndices.push(msgObj.globalIndex);
                    }
                }
            }
        }
        
        return results;
    }
    
    // 全メッセージから検索
    function findInAllMessages(query) {
        const results = [];
        
        // 全メッセージから検索
        window.lineViewer.rawMessages.forEach((msg, index) => {
            if (msg.type === 'message' && msg.content && msg.content.toLowerCase().includes(query.toLowerCase())) {
                results.push(index);
                
                // 既に表示されているメッセージはスキップ（重複防止）
                if (!window.lineViewer.searchResultIndices.includes(index)) {
                    window.lineViewer.searchResultIndices.push(index);
                }
            }
        });
        
        // インデックスでソート
        window.lineViewer.searchResultIndices.sort((a, b) => a - b);
        
        return results;
    }
    
    // 検索UI更新
    function updateSearchUI(visibleCount, totalCount) {
        // 検索結果があれば最初の結果に移動
        if (window.lineViewer.searchResults.length > 0) {
            window.lineViewer.currentSearchIndex = 0;
            highlightCurrentResult();
            
            // 検索ナビゲーションボタンを有効化
            searchPrevButton.disabled = false;
            searchNextButton.disabled = false;
        } else if (totalCount > 0) {
            // 表示されていない検索結果がある場合
            window.lineViewer.currentSearchIndex = -1;
            
            // 検索ナビゲーションボタンを有効化
            searchPrevButton.disabled = false;
            searchNextButton.disabled = false;
        } else {
            // 検索結果なし
            searchStats.textContent = '0 件';
            
            // 検索ナビゲーションボタンを無効化
            searchPrevButton.disabled = true;
            searchNextButton.disabled = true;
            return;
        }
        
        // 表示件数と全件数を表示
        if (visibleCount === totalCount) {
            searchStats.textContent = `${visibleCount}/${totalCount} 件`;
            searchInfoText.textContent = '';
            searchInfoText.classList.add('hidden');
        } else {
            // 表示件数と全件数が異なる場合は、それを表示
            searchStats.textContent = `${visibleCount}/${totalCount} 件`;
            searchInfoText.textContent = `(${totalCount - visibleCount} 件は表示範囲外)`;
            searchInfoText.classList.remove('hidden');
        }
        
        updateSearchNavButtons();
    }
    
    // 検索ナビゲーションボタン状態更新
    function updateSearchNavButtons() {
        // 表示されていない検索結果がある場合、特別なスタイルを適用
        if (window.lineViewer.searchResultIndices.length > window.lineViewer.searchResults.length) {
            searchPrevButton.classList.add('has-hidden-results');
            searchNextButton.classList.add('has-hidden-results');
        } else {
            searchPrevButton.classList.remove('has-hidden-results');
            searchNextButton.classList.remove('has-hidden-results');
        }
    }
    
    // 検索情報を更新
    function updateSearchInfo() {
        // 検索結果がある場合のみ表示
        if (window.lineViewer.searchResultIndices.length > 0) {
            const visibleCount = window.lineViewer.searchResults.length;
            const totalCount = window.lineViewer.searchResultIndices.length;
            
            updateSearchUI(visibleCount, totalCount);
        }
    }
    
    // 検索ナビゲーション関数
    function navigateSearch(direction) {
        // 検索結果がなければ何もしない
        if (window.lineViewer.searchResultIndices.length === 0) return;
        
        // 表示中の検索結果内でナビゲーション
        if (window.lineViewer.searchResults.length > 0) {
            // 現在のハイライトを解除
            if (window.lineViewer.currentSearchIndex >= 0 && window.lineViewer.currentSearchIndex < window.lineViewer.searchResults.length) {
                window.lineViewer.searchResults[window.lineViewer.currentSearchIndex].classList.remove('current-search-result');
            }
            
            // インデックスを更新（循環させる）
            window.lineViewer.currentSearchIndex = (window.lineViewer.currentSearchIndex + direction + window.lineViewer.searchResults.length) % window.lineViewer.searchResults.length;
            
            // 新しい結果をハイライト
            highlightCurrentResult();
            searchStats.textContent = `${window.lineViewer.currentSearchIndex + 1}/${window.lineViewer.searchResults.length} 件`;
        } else {
            // 表示されていない検索結果がある場合
            // その位置までスクロールして表示
            const nextGlobalIndex = getNextGlobalSearchIndex(direction);
            scrollToMessageByIndex(nextGlobalIndex);
        }
    }
    
    // 次の全体検索インデックスを取得
    function getNextGlobalSearchIndex(direction) {
        const totalIndices = window.lineViewer.searchResultIndices.length;
        
        if (totalIndices === 0) return -1;
        
        // 現在のグローバルインデックスを取得
        let currentGlobalIndex = -1;
        if (window.lineViewer.currentSearchIndex >= 0 && window.lineViewer.searchResults.length > 0) {
            const currentElement = window.lineViewer.searchResults[window.lineViewer.currentSearchIndex];
            const messageId = currentElement.getAttribute('data-id');
            const message = window.lineViewer.rawMessages.find(m => m.id === messageId);
            if (message) {
                currentGlobalIndex = message.globalIndex;
            }
        }
        
        // 次のインデックスを探す
        const currentPosition = window.lineViewer.searchResultIndices.indexOf(currentGlobalIndex);
        
        if (currentPosition === -1) {
            // 現在表示されていない場合は最初または最後の結果を返す
            return direction > 0 ? window.lineViewer.searchResultIndices[0] : window.lineViewer.searchResultIndices[totalIndices - 1];
        }
        
        // 次の位置を計算（循環）
        const nextPosition = (currentPosition + direction + totalIndices) % totalIndices;
        return window.lineViewer.searchResultIndices[nextPosition];
    }
    
    // インデックス位置のメッセージにスクロール
    function scrollToMessageByIndex(globalIndex) {
        if (globalIndex < 0) return;
        
        const message = window.lineViewer.rawMessages[globalIndex];
        if (!message) return;
        
        // メッセージが表示範囲内にあるかチェック
        const isVisible = isMessageVisible(globalIndex);
        
        if (isVisible) {
            // 表示範囲内なら、そのメッセージに移動
            const element = document.querySelector(`[data-id="${message.id}"]`);
            if (element) {
                // 現在の検索結果をクリア
                clearCurrentResultHighlight();
                
                // この要素をハイライト
                element.classList.add('current-search-result');
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 検索結果配列内での位置を更新
                const resultIndex = window.lineViewer.searchResults.findIndex(el => el === element);
                if (resultIndex >= 0) {
                    window.lineViewer.currentSearchIndex = resultIndex;
                    searchStats.textContent = `${resultIndex + 1}/${window.lineViewer.searchResults.length} 件`;
                }
                return;
            }
        }
        
        // 表示範囲外または要素が見つからない場合
        // メッセージが表示される位置までスクロール位置を調整
        
        // メッセージが表示範囲より前にある場合、先頭まで戻って読み込み直し
        if (globalIndex < window.lineViewer.currentStartIndex - window.lineViewer.visibleMessages.length) {
            window.coreManager.resetDisplay();
            window.lineViewer.currentStartIndex = 0;
            window.messageRenderer.renderMessages(
                window.lineViewer.rawMessages.slice(0, parseInt(document.getElementById('chunk-size').value, 10)),
                true
            );
            
            // 検索を再実行
            performSearch(window.lineViewer.lastSearchQuery, true);
            
            // 対象メッセージが表示されたら、それに移動
            setTimeout(() => {
                const element = document.querySelector(`[data-id="${message.id}"]`);
                if (element) {
                    clearCurrentResultHighlight();
                    element.classList.add('current-search-result');
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // 検索結果配列内での位置を更新
                    const resultIndex = window.lineViewer.searchResults.findIndex(el => el === element);
                    if (resultIndex >= 0) {
                        window.lineViewer.currentSearchIndex = resultIndex;
                        searchStats.textContent = `${resultIndex + 1}/${window.lineViewer.searchResults.length} 件`;
                    }
                }
            }, 100);
            
            return;
        }
        
        // メッセージが表示範囲より後ろにある場合、そこまで読み込み
        if (globalIndex >= window.lineViewer.currentStartIndex) {
            // ロード中の表示
            document.getElementById('scroll-loading').classList.remove('hidden');
            
            // チャンクサイズに基づいて、目標インデックスを含むチャンクの開始位置を計算
            const chunkSize = parseInt(document.getElementById('chunk-size').value, 10);
            const targetStartIndex = Math.floor(globalIndex / chunkSize) * chunkSize;
            
            // 対象メッセージを含むチャンクを読み込む
            window.lineViewer.currentStartIndex = targetStartIndex;
            window.messageRenderer.renderMessages(
                window.lineViewer.rawMessages.slice(targetStartIndex, targetStartIndex + chunkSize),
                true
            );
            
            // 検索を再実行
            performSearch(window.lineViewer.lastSearchQuery, true);
            
            // 対象メッセージが表示されたら、それに移動
            setTimeout(() => {
                document.getElementById('scroll-loading').classList.add('hidden');
                const element = document.querySelector(`[data-id="${message.id}"]`);
                if (element) {
                    clearCurrentResultHighlight();
                    element.classList.add('current-search-result');
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // 検索結果配列内での位置を更新
                    const resultIndex = window.lineViewer.searchResults.findIndex(el => el === element);
                    if (resultIndex >= 0) {
                        window.lineViewer.currentSearchIndex = resultIndex;
                        searchStats.textContent = `${resultIndex + 1}/${window.lineViewer.searchResults.length} 件`;
                    }
                }
            }, 100);
        }
    }
    
    // メッセージが現在表示範囲内にあるかチェック
    function isMessageVisible(globalIndex) {
        const visibleStartIndex = window.lineViewer.currentStartIndex - window.lineViewer.visibleMessages.length;
        const visibleEndIndex = window.lineViewer.currentStartIndex;
        
        return globalIndex >= visibleStartIndex && globalIndex < visibleEndIndex;
    }
    
    // 現在の検索結果ハイライトをクリア
    function clearCurrentResultHighlight() {
        const currentHighlighted = document.querySelector('.current-search-result');
        if (currentHighlighted) {
            currentHighlighted.classList.remove('current-search-result');
        }
    }
    
    // 現在の検索結果をハイライト
    function highlightCurrentResult() {
        if (window.lineViewer.currentSearchIndex >= 0 && 
            window.lineViewer.currentSearchIndex < window.lineViewer.searchResults.length) {
            const currentElement = window.lineViewer.searchResults[window.lineViewer.currentSearchIndex];
            currentElement.classList.add('current-search-result');
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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
        window.lineViewer.searchResultIndices = [];
        window.lineViewer.currentSearchIndex = -1;
        searchStats.textContent = '';
        searchInfoText.textContent = '';
        searchInfoText.classList.add('hidden');
        
        // 検索クエリをクリア
        window.lineViewer.lastSearchQuery = '';
        
        // ナビゲーションボタンを無効化
        searchPrevButton.disabled = true;
        searchNextButton.disabled = true;
        searchPrevButton.classList.remove('has-hidden-results');
        searchNextButton.classList.remove('has-hidden-results');
    }

    // 検索関連の関数をグローバルに公開
    window.searchManager = {
        performSearch,
        updateSearchInfo,
        clearSearch,
        scrollToMessageByIndex
    };
});
