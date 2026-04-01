import React, { useState } from 'react';
import { DentalChart as DentalChartType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

interface Props {
  patientId: string;
  charts: DentalChartType[];
}

const TOOTH_STATUSES = [
  { value: 'sound', label: 'سليم', color: 'bg-green-100 border-green-500 text-green-700' },
  { value: 'decayed', label: 'تسوس', color: 'bg-red-100 border-red-500 text-red-700' },
  { value: 'filled', label: 'حشوة', color: 'bg-blue-100 border-blue-500 text-blue-700' },
  { value: 'extracted', label: 'مخلوع', color: 'bg-slate-200 border-slate-500 text-slate-700' },
  { value: 'crown', label: 'تاج', color: 'bg-purple-100 border-purple-500 text-purple-700' },
  { value: 'implant', label: 'زرعة', color: 'bg-orange-100 border-orange-500 text-orange-700' },
];

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const DentalChart: React.FC<Props> = ({ patientId, charts }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [status, setStatus] = useState('sound');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const getToothStatus = (toothNumber: number) => {
    const chart = charts.find(c => c.tooth_number === toothNumber);
    if (!chart) return TOOTH_STATUSES[0];
    return TOOTH_STATUSES.find(s => s.value === chart.status) || TOOTH_STATUSES[0];
  };

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    const chart = charts.find(c => c.tooth_number === toothNumber);
    if (chart) {
      setStatus(chart.status);
      setNotes(chart.notes || '');
    } else {
      setStatus('sound');
      setNotes('');
    }
  };

  const handleSave = async () => {
    if (!selectedTooth) return;
    setLoading(true);
    const existingChart = charts.find(c => c.tooth_number === selectedTooth);
    try {
      if (existingChart) {
        await updateDoc(doc(db, 'dental_charts', existingChart.id), {
          status,
          notes,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'dental_charts'), {
          patient_id: patientId,
          tooth_number: selectedTooth,
          status,
          notes,
          updated_at: new Date().toISOString()
        });
      }
      setSelectedTooth(null);
    } catch (error) {
      handleFirestoreError(error, existingChart ? OperationType.UPDATE : OperationType.CREATE, 'dental_charts');
    } finally {
      setLoading(false);
    }
  };

  const renderTooth = (toothNumber: number) => {
    const toothStatus = getToothStatus(toothNumber);
    const isSelected = selectedTooth === toothNumber;
    
    return (
      <button
        key={toothNumber}
        onClick={() => handleToothClick(toothNumber)}
        className={`
          flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
          ${toothStatus.color}
          ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}
        `}
      >
        <span className="font-bold text-sm mb-1">{toothNumber}</span>
        <div className="w-6 h-8 bg-white/50 rounded-t-sm rounded-b-md border border-current opacity-80" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h4 className="font-bold text-slate-800 text-lg mb-6 text-center">مخطط الأسنان</h4>
        
        <div className="space-y-8">
          {/* Upper Teeth */}
          <div>
            <p className="text-center text-slate-500 text-sm mb-2">الفك العلوي</p>
            <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
              {UPPER_TEETH.map(renderTooth)}
            </div>
          </div>
          
          {/* Lower Teeth */}
          <div>
            <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
              {LOWER_TEETH.map(renderTooth)}
            </div>
            <p className="text-center text-slate-500 text-sm mt-2">الفك السفلي</p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {TOOTH_STATUSES.map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 ${s.color}`} />
              <span className="text-sm text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {selectedTooth && (
        <Card className="p-6 bg-blue-50 border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-800">
              تحديث حالة السن رقم {selectedTooth}
            </h4>
            <button 
              onClick={() => setSelectedTooth(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              إلغاء
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TOOTH_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات حول الإجراء..."
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التحديث'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
