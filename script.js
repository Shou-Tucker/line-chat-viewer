// レガシースクリプト - 互換性のために残しています
// 主要な機能は個別のモジュールに移行されました
document.addEventListener('DOMContentLoaded', function() {
    console.log('LINE Chat Viewer が初期化されました');
    console.log('モジュール構造: Core, FileHandler, UIManager, Parser, Search, Avatar, Render');
    
    // 互換性レイヤー - 必要に応じて古いスクリプトからの参照をリダイレクト
    window.handleFileSelect = window.fileHandler ? window.fileHandler.handleFileSelect : function() { 
        console.error('fileHandler モジュールが読み込まれていません');
    };
    
    window.loadFile = window.fileHandler ? window.fileHandler.loadFile : function() {
        console.error('fileHandler モジュールが読み込まれていません');
    };
    
    // デバッグ用
    console.log('利用可能なモジュール:');
    console.log('- Core:', window.coreManager ? '読み込み済み' : '未読み込み');
    console.log('- FileHandler:', window.fileHandler ? '読み込み済み' : '未読み込み');
    console.log('- UIManager:', window.uiManager ? '読み込み済み' : '未読み込み');
    console.log('- Parser:', window.parserManager ? '読み込み済み' : '未読み込み');
    console.log('- Search:', window.searchManager ? '読み込み済み' : '未読み込み');
    console.log('- Avatar:', window.avatarManager ? '読み込み済み' : '未読み込み');
    console.log('- Render:', window.messageRenderer ? '読み込み済み' : '未読み込み');
});