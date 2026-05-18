import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/components/client/create-request/CreateRequestModal.tsx');

const content = `import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { CreateRequestScheduleStep, type MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import { CreateRequestReviewStep } from '@/components/client/create-request/CreateRequestReviewStep';
import {
  emptyRequestAddress,
  type RequestAddressValue,
} from '@/components/client/create-request/RequestAddressInput';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getRequestDescriptionCopy } from '@/data/createRequestStepCopy';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { descriptionContainsContactInfo } from '@/utils/descriptionContactGuard';
import {
  buildJobDateLabel,
  isScheduleStepComplete,
  jobUrgencyFromPriority,
  resolvePreferredDateIso,
  type PreferredDateMode,
  type RequestPriority,
  type TimeWindow,
} from '@/utils/requestSchedule';

type ModalStep = 'category' | 'schedule' | 'description' | 'review';
const STEP_ORDER: ModalStep[] = ['category', 'schedule', 'description', 'review'];
const STEP_ICONS = { category: Icons.Grid, schedule: Icons.Calendar, description: Icons.Type, review: Icons.CheckCircle2 };

type Props = {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
  clientId: string;
  clientName: string;
  clientAvatar: string;
};

function needsMoveBuilding(type: MovePropertyType) {
  return type === 'apartment' || type === 'office' || type === 'business';
}

export function CreateRequestModal({ open, onClose, onPublished, clientId, clientName, clientAvatar }: Props) {
  const { t, language } = useLanguage();
  const { createJob } = useAppData();
  const [step, setStep] = useState<ModalStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('flexible');
  const [preferredDateMode, setPreferredDateMode] = useState<PreferredDateMode>('today');
  const [preferredDateIso, setPreferredDateIso] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState<TimeWindow>('');
  const [preferredTimeSpecific, setPreferredTimeSpecific] = useState('');
  const [showSpecificTime, setShowSpecificTime] = useState(false);
  const [requestAddress, setRequestAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [movePickupAddress, setMovePickupAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [moveDeliveryAddress, setMoveDeliveryAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [movePropertyType, setMovePropertyType] = useState<MovePropertyType>('');
  const [movePickupFloor, setMovePickupFloor] = useState('');
  const [movePickupElevator, setMovePickupElevator] = useState('');
  const [moveDeliveryFloor, setMoveDeliveryFloor] = useState('');
  const [moveDeliveryElevator, setMoveDeliveryElevator] = useState('');
  const [cleaningHouseFloors, setCleaningHouseFloors] = useState('');
  const [cleaningAptFloor, setCleaningAptFloor] = useState('');
  const [cleaningHasElevator, setCleaningHasElevator] = useState('');
  const [postText, setPostText] = useState('');

  const descriptionCopy = useMemo(
    () => (selectedCategory && selectedSubcategory ? getRequestDescriptionCopy(language, selectedCategory, selectedSubcategory) : null),
    [language, selectedCategory, selectedSubcategory],
  );
  const scheduleInput = useMemo(
    () => ({ priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific }),
    [priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific],
  );
  const contactBlocked = descriptionContainsContactInfo(postText);

  const scheduleComplete = useMemo(() => {
    if (!isScheduleStepComplete(scheduleInput)) return false;
    if (selectedCategory === 'moving') {
      if (!movePropertyType || !movePickupAddress.display.trim() || !moveDeliveryAddress.display.trim()) return false;
      if (needsMoveBuilding(movePropertyType)) {
        return !!(movePickupFloor.trim() && movePickupElevator && moveDeliveryFloor.trim() && moveDeliveryElevator);
      }
      return true;
    }
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'house' && !cleaningHouseFloors) return false;
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'apartment' && (!cleaningAptFloor || !cleaningHasElevator)) return false;
    return Boolean(requestAddress.display.trim());
  }, [scheduleInput, selectedCategory, selectedSubcategory, requestAddress.display, movePropertyType, movePickupAddress.display, moveDeliveryAddress.display, movePickupFloor, movePickupElevator, moveDeliveryFloor, moveDeliveryElevator, cleaningHouseFloors, cleaningAptFloor, cleaningHasElevator]);

  const descriptionComplete = postText.trim().length > 0 && !contactBlocked;

  const reset = () => {
    setStep('category');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setPriority('flexible');
    setPreferredDateMode('today');
    setPreferredDateIso('');
    setPreferredTimeWindow('');
    setPreferredTimeSpecific('');
    setShowSpecificTime(false);
    setRequestAddress(emptyRequestAddress());
    setMovePickupAddress(emptyRequestAddress());
    setMoveDeliveryAddress(emptyRequestAddress());
    setMovePropertyType('');
    setMovePickupFloor('');
    setMovePickupElevator('');
    setMoveDeliveryFloor('');
    setMoveDeliveryElevator('');
    setCleaningHouseFloors('');
    setCleaningAptFloor('');
    setCleaningHasElevator('');
    setPostText('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePublish = () => {
    const yn = (v: string) => (v === 'yes' ? t('create_modal.moving_yes') : v === 'no' ? t('create_modal.moving_no') : '—');
    let extras = '';
    if (selectedCategory === 'moving') {
      const lines = [\`\${t('create_modal.moving_property_type')}: \${t(\`create_modal.moving_property_\${movePropertyType}\`)}\`, \`\${t('create_modal.moving_pickup_address')}: \${movePickupAddress.display}\`];
      if (needsMoveBuilding(movePropertyType)) {
        lines.push(\`\${t('create_modal.moving_floor_pickup')}: \${movePickupFloor.trim()}\`, \`\${t('create_modal.moving_elevator_label')}: \${yn(movePickupElevator)}\`);
      }
      lines.push(\`\${t('create_modal.moving_delivery_address')}: \${moveDeliveryAddress.display}\`);
      if (needsMoveBuilding(movePropertyType)) {
        lines.push(\`\${t('create_modal.moving_floor_delivery')}: \${moveDeliveryFloor.trim()}\`, \`\${t('create_modal.moving_elevator_delivery')}: \${yn(moveDeliveryElevator)}\`);
      }
      extras = \`\\n\\n—\\n\${lines.join('\\n')}\`;
    } else if (selectedCategory === 'cleaning') {
      const lines = [];
      if (selectedSubcategory === 'house' && cleaningHouseFloors) lines.push(\`\${t('create_modal.cleaning_house_floors')}: \${cleaningHouseFloors}\`);
      if (selectedSubcategory === 'apartment') {
        if (cleaningAptFloor) lines.push(\`\${t('create_modal.cleaning_apt_floor')}: \${cleaningAptFloor}\`);
        if (cleaningHasElevator) lines.push(\`\${t('create_modal.cleaning_elevator')}: \${cleaningHasElevator === 'yes' ? t('create_modal.moving_yes') : t('create_modal.moving_no')}\`);
      }
      if (lines.length) extras = \`\\n\\n—\\n\${lines.join('\\n')}\`;
    }
    const fullDescription = \`\${postText.trim()}\${extras}\`;
    const primaryAddress = selectedCategory === 'moving' ? movePickupAddress : requestAddress;
    const locationLabel = [primaryAddress.display.trim(), primaryAddress.city, primaryAddress.region].filter(Boolean).join(', ') || t('jobs.remote');
    createJob({
      clientId, clientName, clientAvatar,
      title: fullDescription.slice(0, 30) + (fullDescription.length > 30 ? '...' : ''),
      description: fullDescription,
      category: selectedCategory,
      subcategory: selectedSubcategory || null,
      location: locationLabel,
      address: primaryAddress.address || primaryAddress.display.trim() || null,
      city: primaryAddress.city || null,
      region: primaryAddress.region || null,
      latitude: primaryAddress.latitude,
      longitude: primaryAddress.longitude,
      preferredDate: resolvePreferredDateIso(scheduleInput),
      preferredTimeWindow: preferredTimeWindow || null,
      preferredTime: preferredTimeSpecific.trim() || null,
      date: buildJobDateLabel(scheduleInput),
      value: t('jobs.value_negotiable'),
      urgency: jobUrgencyFromPriority(priority),
    });
    reset();
    onPublished();
    onClose();
  };

  if (!open) return null;
  const activeCat = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md" onClick={handleClose}>
      <motionPanel onClick={(e) => e.stopPropagation()}>
        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.PlusCircle className="w-5 h-5 text-blue-600" />
            {t('client_dashboard.create_order_title')}
          </h3>
          <button type="button" onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500" aria-label={t('common.close')}>
            <Icons.X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-6 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-between relative">
            <motionBar style={{ width: \`\${(stepIndex / Math.max(STEP_ORDER.length - 1, 1)) * 100}%\` }} />
            {STEP_ORDER.map((s, idx) => {
              const Icon = STEP_ICONS[s];
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              const active = isPast || isCurrent;
              return (
                <div key={s} className="relative z-10">
                  <div className={\`w-8 h-8 rounded-full flex items-center justify-center \${active ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}\`}>
                    {isPast ? <Icons.Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </motionPanel>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {step === 'category' && !selectedCategory && (
            <section>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_category')}</h4>
              <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_category_desc')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICE_CATEGORIES.map((cat) => {
                  const IconC = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon];
                  return (
                    <button key={cat.id} type="button" onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(''); }}
                      className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 bg-white">
                      <span className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-2">{IconC ? <IconC className="w-6 h-6" /> : null}</span>
                      <span className="text-sm font-bold">{t(\`categories.\${cat.id}\`)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {step === 'category' && selectedCategory && (
            <section>
              <button type="button" onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); }} className="text-sm font-bold text-blue-600 mb-4">← {t('create_modal.change_category')}</button>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_sub')}</h4>
              <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_sub_desc', { category: activeCat ? t(\`categories.\${activeCat.id}\`) : '' })}</p>
              <motionSubList>
                {activeCat?.subKeys.map((subKey) => (
                  <button key={subKey} type="button" onClick={() => { setSelectedSubcategory(subKey); setStep('schedule'); }}
                    className="flex w-full items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 bg-white text-left font-bold">
                    {t(\`service_subs.\${activeCat.id}.\${subKey}\`)}
                    <Icons.ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </motionSubList>
            </section>
          )}
          {step === 'schedule' && (
            <CreateRequestScheduleStep t={t} selectedCategory={selectedCategory} selectedSubcategory={selectedSubcategory}
              priority={priority} setPriority={setPriority} preferredDateMode={preferredDateMode} setPreferredDateMode={setPreferredDateMode}
              preferredDateIso={preferredDateIso} setPreferredDateIso={setPreferredDateIso} preferredTimeWindow={preferredTimeWindow} setPreferredTimeWindow={setPreferredTimeWindow}
              preferredTimeSpecific={preferredTimeSpecific} setPreferredTimeSpecific={setPreferredTimeSpecific} showSpecificTime={showSpecificTime} setShowSpecificTime={setShowSpecificTime}
              requestAddress={requestAddress} setRequestAddress={setRequestAddress} movePropertyType={movePropertyType} setMovePropertyType={setMovePropertyType}
              movePickupAddress={movePickupAddress} setMovePickupAddress={setMovePickupAddress} moveDeliveryAddress={moveDeliveryAddress} setMoveDeliveryAddress={setMoveDeliveryAddress}
              movePickupFloor={movePickupFloor} setMovePickupFloor={setMovePickupFloor} movePickupElevator={movePickupElevator} setMovePickupElevator={setMovePickupElevator}
              moveDeliveryFloor={moveDeliveryFloor} setMoveDeliveryFloor={setMoveDeliveryFloor} moveDeliveryElevator={moveDeliveryElevator} setMoveDeliveryElevator={setMoveDeliveryElevator}
              cleaningHouseFloors={cleaningHouseFloors} setCleaningHouseFloors={setCleaningHouseFloors} cleaningAptFloor={cleaningAptFloor} setCleaningAptFloor={setCleaningAptFloor}
              cleaningHasElevator={cleaningHasElevator} setCleaningHasElevator={setCleaningHasElevator} />
          )}
          {step === 'description' && (
            <section>
              <label className="block text-2xl font-bold text-gray-900 mb-2">{t('create_modal.describe_simple')}</label>
              <p className="text-gray-500 text-sm mb-4">{t('create_modal.describe_desc_short')}</p>
              <textarea autoFocus value={postText} onChange={(e) => setPostText(e.target.value)} rows={8}
                placeholder={descriptionCopy?.placeholder ?? t('create_modal.placeholder')}
                className={\`w-full border-2 rounded-2xl px-5 py-4 resize-none \${contactBlocked ? 'border-amber-400' : 'border-gray-200'}\`} />
              {contactBlocked && <p className="mt-3 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{t('create_modal.description_contact_warning')}</p>}
            </section>
          )}
          {step === 'review' && (
            <CreateRequestReviewStep t={t} selectedCategory={selectedCategory} selectedSubcategory={selectedSubcategory} postText={postText}
              requestAddress={requestAddress} movePickupAddress={movePickupAddress} moveDeliveryAddress={moveDeliveryAddress}
              movePropertyType={movePropertyType} movePickupFloor={movePickupFloor} movePickupElevator={movePickupElevator}
              moveDeliveryFloor={moveDeliveryFloor} moveDeliveryElevator={moveDeliveryElevator} priority={priority}
              preferredTimeWindow={preferredTimeWindow} preferredTimeSpecific={preferredTimeSpecific} cleaningHouseFloors={cleaningHouseFloors}
              cleaningAptFloor={cleaningAptFloor} cleaningHasElevator={cleaningHasElevator} />
          )}
        </motionPanel>
        <footer className="px-6 py-4 border-t flex justify-between shrink-0">
          {step === 'category' && !selectedCategory ? <span /> : (
            <button type="button" onClick={() => {
              if (step === 'category' && selectedCategory) { setSelectedCategory(''); return; }
              const i = STEP_ORDER.indexOf(step); if (i > 0) setStep(STEP_ORDER[i - 1]);
            }} className="px-5 py-3 font-bold text-gray-600">{t('common.back')}</button>
          )}
          {step === 'review' ? (
            <button type="button" onClick={handlePublish} className="ml-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
              {t('create_modal.publish_help')} <Icons.Rocket className="w-5 h-5" />
            </button>
          ) : step !== 'category' ? (
            <button type="button" disabled={(step === 'schedule' && !scheduleComplete) || (step === 'description' && !descriptionComplete)}
              onClick={() => { const i = STEP_ORDER.indexOf(step); if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]); }}
              className="ml-auto bg-gray-900 disabled:bg-gray-200 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
              {t('common.continue')} <Icons.ArrowRight className="w-5 h-5" />
            </button>
          ) : <span />}
        </footer>
      </motionPanel>
    </motionPanel>
  );
}

function motionPanel({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[min(92dvh,900px)] overflow-hidden" onClick={onClick}>{children}</div>;
}
function motionBar({ style }: { style: { width: string } }) {
  return <motionBarInner style={style} />;
}
function motionBarInner({ style }: { style: { width: string } }) {
  return <div className="absolute top-1/2 left-0 h-1 bg-gray-100 w-full -translate-y-1/2 rounded-full" />;
}
function motionSubList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</motionSubList>;
}
`;

// Fix motion* to div in generated file
const fixed = content
  .replace(/function motionPanel/g, 'function Panel')
  .replace(/function motionBar/g, 'function ProgressBar')
  .replace(/function motionBarInner/g, 'function ProgressTrack')
  .replace(/function motionSubList/g, 'function SubList')
  .replace(/<motionPanel/g, '<Panel')
  .replace(/<\/motionPanel>/g, '</Panel>')
  .replace(/<motionBar /g, '<ProgressBar ')
  .replace(/<motionSubList>/g, '<SubList>')
  .replace(/<\/motionSubList>/g, '</SubList>')
  .replace(/<\/motionPanel>/g, '</Panel>');

// second pass for any remaining
const final = fixed.split(/motion\w+/).join('').replace(/<Panel/g, '<Panel').replace(/Panel onClick/g, 'Panel onClick');

// Actually simpler - replace all motionWord with div equivalents manually in fixed string
let outStr = content;
outStr = outStr.replace(/<motionPanel/g, '<__PANEL__');
outStr = outStr.replace(/<\/motionPanel>/g, '</__PANEL__>');
outStr = outStr.replace(/<motionBar /g, '<__BAR__ ');
outStr = outStr.replace(/<motionSubList>/g, '<__SUB__>');
outStr = outStr.replace(/<\/motionSubList>/g, '</__SUB__>');
outStr = outStr.replace(/function motionPanel/g, 'function Panel');
outStr = outStr.replace(/function motionBar\(/g, 'function ProgressBar(');
outStr = outStr.replace(/function motionBarInner/g, 'function ProgressTrack');
outStr = outStr.replace(/function motionSubList/g, 'function SubList');

outStr = outStr.replace(/<__PANEL__/g, '<div');
outStr = outStr.replace(/<\/__PANEL__>/g, '</motionPanel>');
outStr = outStr.split('</motionPanel>').join('</motionPanel>');

fs.writeFileSync(out, outStr);
console.log('wrote', out);
