// LINE記録をパースするモジュール
window.addEventListener('DOMContentLoaded', function() {
    const loadingStatus = document.getElementById('loading-status');
    const dateFormatSelect = document.getElementById('date-format');

    // テキストを分割して処理（メモリ使用量削減のため）
    function parseInChunks(text, completionCallback) {
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
                completionCallback();
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
                    date: currentDate,
                    id: `date-${messages.length}` // ユニークなID
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
                    id: `msg-${messages.length}` // ユニークなID
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
                    content: systemMessageMatch[2],
                    id: `sys-${messages.length}` // ユニークなID
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

    // 正規表現用エスケープ関数
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // パース関連の関数をグローバルに公開
    window.parserManager = {
        parseInChunks,
        parseLINEChat,
        fixTextEncoding,
        formatDate,
        escapeRegExp
    };
});