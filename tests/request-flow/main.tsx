import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { CreateRequestModal } from '../../src/components/client/create-request/CreateRequestModal';
import './styles.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><CreateRequestModal open onClose={() => {}} onPublished={() => { document.body.dataset.published = 'true'; }} /></MemoryRouter>);
