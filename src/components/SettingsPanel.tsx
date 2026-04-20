import { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { dataExportImportService } from '../services/dataExportImportService';
import { exportToFile } from '../utils/helpers';

interface SettingsPanelProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function SettingsPanel({ onClose, onImportComplete }: SettingsPanelProps) {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importPreview, setImportPreview] = useState<{ notesCount: number; categoriesCount: number; tagsCount: number; exportDate?: string } | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    try {
      const jsonString = await storageService.exportData();
      const filename = `chrome-notes-export-${new Date().toISOString().split('T')[0]}.json`;
      await exportToFile(jsonString, filename, 'application/json');
    } catch {
      setImportStatus({ type: 'error', message: '导出失败，请重试' });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const content = await dataExportImportService.importFromFile(file);
        setImportFileContent(content);
        const preview = dataExportImportService.previewImportData(content);
        if (preview) {
          setImportPreview(preview);
          setImportStatus({ type: 'warning', message: '文件解析成功，可以导入' });
        } else {
          setImportStatus({ type: 'error', message: '文件格式无效' });
        }
      } catch {
        setImportStatus({ type: 'error', message: '文件读取失败' });
      }
    }
  };

  const handleImport = async () => {
    if (!importFileContent) return;
    try {
      const result = await dataExportImportService.importData(importFileContent, { mode: importMode, skipValidation: false });
      if (result.success) {
        setImportStatus({ type: 'success', message: `导入成功：${result.imported.notes}个笔记` });
        setImportFileContent(null);
        setImportPreview(null);
        onImportComplete();
      } else {
        setImportStatus({ type: 'error', message: result.errors.join('; ') });
      }
    } catch {
      setImportStatus({ type: 'error', message: '导入失败' });
    }
  };

  return (
    <div className="settings-panel">
      <h3>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        设置
      </h3>
      <div className="import-export-section">
        <h4>导出数据</h4>
        <button className="btn-export" onClick={handleExportJSON} title="导出为 JSON">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          导出 JSON
        </button>
        <h4>导入数据</h4>
        <div className="file-input-wrapper">
          <label className="file-input-label">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            选择文件
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelect} />
          </label>
        </div>
        {importFileContent && (
          <>
            <div className="import-options">
              <label>导入模式</label>
              <div className="option-item">
                <input type="radio" id="merge" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                <label htmlFor="merge">合并导入</label>
              </div>
              <div className="option-item">
                <input type="radio" id="replace" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                <label htmlFor="replace">完全替换</label>
              </div>
            </div>
            {importPreview && (
              <div className="import-preview">
                <strong>预览：</strong>
                <div>笔记: {importPreview.notesCount}</div>
                <div>分类: {importPreview.categoriesCount}</div>
                <div>标签: {importPreview.tagsCount}</div>
                {importPreview.exportDate && <div>日期: {new Date(importPreview.exportDate).toLocaleString()}</div>}
              </div>
            )}
            <button className="btn-import" onClick={handleImport} title="执行导入">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              开始导入
            </button>
          </>
        )}
        {importStatus.message && <div className={`import-status ${importStatus.type}`}>{importStatus.message}</div>}
      </div>
    </div>
  );
}