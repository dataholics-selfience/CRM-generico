import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Save, X, GripVertical,
  Palette, Type, Move
} from 'lucide-react';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, where, getDocs 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PipelineStageType } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const PREDEFINED_COLORS = [
  'bg-yellow-200 text-yellow-800 border-yellow-300',
  'bg-blue-200 text-blue-800 border-blue-300',
  'bg-purple-200 text-purple-800 border-purple-300',
  'bg-green-200 text-green-800 border-green-300',
  'bg-orange-200 text-orange-800 border-orange-300',
  'bg-indigo-200 text-indigo-800 border-indigo-300',
  'bg-pink-200 text-pink-800 border-pink-300',
  'bg-emerald-200 text-emerald-800 border-emerald-300',
  'bg-red-200 text-red-800 border-red-300',
  'bg-gray-200 text-gray-800 border-gray-300',
  'bg-cyan-200 text-cyan-800 border-cyan-300',
  'bg-lime-200 text-lime-800 border-lime-300'
];

const StageManagement = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [stages, setStages] = useState<PipelineStageType[]>([]);
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedStage, setDraggedStage] = useState<string | null>(null);

  useEffect(() => {
    const stagesQuery = query(collection(db, 'pipelineStages'));
    
    const unsubscribe = onSnapshot(stagesQuery, (snapshot) => {
      const stagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PipelineStageType[];
      
      stagesData.sort((a, b) => a.position - b.position);
      setStages(stagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize default stages if none exist
  useEffect(() => {
    const initializeDefaultStages = async () => {
      if (stages.length === 0 && !loading && auth.currentUser) {
        const defaultStages = [
          {
            name: 'Proposta',
            color: 'bg-indigo-200 text-indigo-800 border-indigo-300',
            position: 0,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'Negociação',
            color: 'bg-pink-200 text-pink-800 border-pink-300',
            position: 1,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'Fechada',
            color: 'bg-emerald-200 text-emerald-800 border-emerald-300',
            position: 2,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'Perdida',
            color: 'bg-red-200 text-red-800 border-red-300',
            position: 3,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        for (const stage of defaultStages) {
          await addDoc(collection(db, 'pipelineStages'), stage);
        }
      }
    };

    initializeDefaultStages();
  }, [stages.length, loading]);

  const handleDeleteStage = async (stageId: string) => {
    // Check if stage is being used by any clients
    const clientsQuery = query(
      collection(db, 'clients'),
      where('stage', '==', stageId)
    );
    
    const clientsSnapshot = await getDocs(clientsQuery);
    
    if (!clientsSnapshot.empty) {
      alert('Esta etapa não pode ser excluída pois está sendo usada por clientes.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta etapa?')) {
      await deleteDoc(doc(db, 'pipelineStages', stageId));
    }
  };

  const toggleStageStatus = async (stageId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'pipelineStages', stageId), {
      active: !currentStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedStage(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    
    if (!draggedStage || draggedStage === targetStageId) {
      setDraggedStage(null);
      return;
    }

    const draggedIndex = stages.findIndex(s => s.id === draggedStage);
    const targetIndex = stages.findIndex(s => s.id === targetStageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder stages
    const newStages = [...stages];
    const [draggedItem] = newStages.splice(draggedIndex, 1);
    newStages.splice(targetIndex, 0, draggedItem);

    // Update positions in database
    const updatePromises = newStages.map((stage, index) => 
      updateDoc(doc(db, 'pipelineStages', stage.id), {
        position: index,
        updatedAt: new Date().toISOString()
      })
    );

    await Promise.all(updatePromises);
    setDraggedStage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando etapas...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={`text-gray-400 hover:text-white`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Gerenciar Etapas do Pipeline
          </h1>
        </div>
        
        <button
          onClick={() => setShowAddStage(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Nova Etapa
        </button>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h3 className="text-blue-400 font-medium mb-2">Como usar:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Arraste as etapas para reordená-las</li>
              <li>• Clique no ícone de edição para alterar nome e cor</li>
              <li>• Desative etapas que não estão sendo usadas</li>
              <li>• Etapas com clientes não podem ser excluídas</li>
            </ul>
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <StageCard
                key={stage.id}
                stage={stage}
                index={index}
                onEdit={setEditingStage}
                onDelete={handleDeleteStage}
                onToggleStatus={toggleStageStatus}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedStage === stage.id}
              />
            ))}
          </div>
        </div>
      </div>

      {showAddStage && (
        <StageModal
          onClose={() => setShowAddStage(false)}
          onSave={() => setShowAddStage(false)}
          nextPosition={stages.length}
        />
      )}

      {editingStage && (
        <StageModal
          stage={editingStage}
          onClose={() => setEditingStage(null)}
          onSave={() => setEditingStage(null)}
        />
      )}
    </div>
  );
};

const StageCard = ({ 
  stage, 
  index,
  onEdit, 
  onDelete, 
  onToggleStatus,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}: { 
  stage: PipelineStageType;
  index: number;
  onEdit: (stage: PipelineStageType) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDragStart: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  isDragging: boolean;
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, stage.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      className={`bg-gray-800 rounded-lg p-4 transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <GripVertical size={20} className="text-gray-400 cursor-move" />
          
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-mono text-sm w-8">
              #{index + 1}
            </span>
            <div className={`px-3 py-1 rounded-full border text-sm font-medium ${stage.color}`}>
              {stage.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs ${
            stage.active 
              ? 'bg-green-900/30 text-green-400 border border-green-800' 
              : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}>
            {stage.active ? 'Ativa' : 'Inativa'}
          </div>
          
          <button
            onClick={() => onEdit(stage)}
            className="text-blue-400 hover:text-blue-300 p-1"
          >
            <Edit size={16} />
          </button>
          
          <button
            onClick={() => onToggleStatus(stage.id, stage.active)}
            className={`p-1 ${
              stage.active 
                ? 'text-yellow-400 hover:text-yellow-300' 
                : 'text-green-400 hover:text-green-300'
            }`}
          >
            {stage.active ? <X size={16} /> : <Plus size={16} />}
          </button>
          
          <button
            onClick={() => onDelete(stage.id)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StageModal = ({ 
  stage, 
  onClose, 
  onSave,
  nextPosition = 0
}: { 
  stage?: PipelineStageType;
  onClose: () => void;
  onSave: () => void;
  nextPosition?: number;
}) => {
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    color: stage?.color || PREDEFINED_COLORS[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);

    try {
      const stageData = {
        ...formData,
        active: true,
        updatedAt: new Date().toISOString(),
        ...(stage ? {} : { 
          position: nextPosition,
          createdAt: new Date().toISOString() 
        })
      };

      if (stage) {
        await updateDoc(doc(db, 'pipelineStages', stage.id), stageData);
      } else {
        await addDoc(collection(db, 'pipelineStages'), stageData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving stage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {stage ? 'Editar Etapa' : 'Nova Etapa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Etapa *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome da etapa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cor da Etapa *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PREDEFINED_COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`px-3 py-2 rounded border text-sm font-medium transition-all ${color} ${
                    formData.color === color 
                      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' 
                      : 'hover:scale-105'
                  }`}
                >
                  Exemplo
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {stage ? 'Atualizar' : 'Criar'} Etapa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StageManagement;