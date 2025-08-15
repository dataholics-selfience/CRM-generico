import { useState } from 'react';
import { X, Save, Loader2, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { addDoc, collection, query, getDocs, where, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, ServiceType, UserType, PipelineStageType, CompanyType, BusinessType, ContactType } from '../types';

interface AddClientModalProps {
  onClose: () => void;
  services: ServiceType[];
  userData: UserType | null;
  stages: PipelineStageType[];
}

const AddClientModal = ({ onClose, services, userData, stages }: AddClientModalProps) => {
  const [formData, setFormData] = useState<Omit<ClientType, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'assignedTo'>>({
    nome: '',
    empresa: '',
    cnpj: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    segmento: '',
    regiao: '',
    tamanho: '',
    faturamento: '',
    cargoAlvo: '',
    dores: '',
    stage: stages.length > 0 ? stages[0].id : '',
    serviceId: '',
    planId: ''
  });
};

export default AddClientModal;