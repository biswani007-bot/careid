import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, AlertCircle, CheckCircle2, 
  Save, RefreshCw, Shield, Sparkles, Filter
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { scheduleService, ScheduleFullDTO, WorkingHoursItem, GeneratedSlotDTO } from '@/services/scheduleService';

const DAYS_OF_WEEK = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' },
];

export const ScheduleManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleFullDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(5);
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [workingHours, setWorkingHours] = useState<WorkingHoursItem[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isEnabled: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isEnabled: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isEnabled: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isEnabled: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', isEnabled: true },
    { dayOfWeek: 6, startTime: '10:00', endTime: '14:00', isEnabled: false },
    { dayOfWeek: 0, startTime: '10:00', endTime: '14:00', isEnabled: false },
  ]);

  // Slots State
  const [slots, setSlots] = useState<GeneratedSlotDTO[]>([]);
  const [slotFilter, setSlotFilter] = useState<'ALL' | 'AVAILABLE' | 'BOOKED' | 'CANCELLED'>('ALL');

  // Load Initial Schedule
  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await scheduleService.listSchedules();
      if (list.length > 0) {
        const current = list.find((s) => s.doctorProfileId === user?.id) || null;
        if (current) {
          setSchedule(current);
          setSlotDuration(current.slotDurationMinutes || 30);
          setBufferMinutes(current.bufferMinutes || 5);
          setTimezone(current.timezone || 'America/New_York');
          if (current.workingHours && current.workingHours.length > 0) {
            // Merge with day template
            const merged = DAYS_OF_WEEK.map((d) => {
              const found = current.workingHours.find((w) => w.dayOfWeek === d.day);
              return (
                found || {
                  dayOfWeek: d.day,
                  startTime: '09:00',
                  endTime: '17:00',
                  isEnabled: d.day >= 1 && d.day <= 5,
                }
              );
            });
            setWorkingHours(merged);
          }

          // Fetch current week slots
          const today = new Date();
          const fromDate = today.toISOString().split('T')[0];
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          const toDate = nextWeek.toISOString().split('T')[0];
          const generated = await scheduleService.getSlots(current.id, fromDate, toDate);
          setSlots(generated);
        }
      }
    } catch (err: any) {
      console.error('Failed to load schedule:', err);
      setErrorMessage(err.message || 'Unable to load clinical schedule.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleDayToggle = (day: number) => {
    setWorkingHours((prev) =>
      prev.map((item) => (item.dayOfWeek === day ? { ...item, isEnabled: !item.isEnabled } : item))
    );
  };

  const handleTimeChange = (day: number, field: 'startTime' | 'endTime' | 'breakStart' | 'breakEnd', value: string) => {
    setWorkingHours((prev) =>
      prev.map((item) => (item.dayOfWeek === day ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        ownerType: 'DOCTOR',
        doctorProfileId: user?.id,
        title: `${user?.specialty || 'Clinical'} Outpatient Schedule`,
        timezone,
        slotDurationMinutes: Number(slotDuration),
        bufferMinutes: Number(bufferMinutes),
        maxPatientsPerSlot: 1,
        effectiveFrom: todayStr,
        isActive: true,
        workingHours: workingHours.map((wh) => ({
          dayOfWeek: wh.dayOfWeek,
          sessionType: 'MORNING',
          startTime: wh.startTime,
          endTime: wh.endTime,
          breakStart: wh.breakStart || undefined,
          breakEnd: wh.breakEnd || undefined,
          isEnabled: Boolean(wh.isEnabled),
        })),
      };

      let saved: ScheduleFullDTO;
      if (schedule && schedule.id) {
        saved = await scheduleService.updateSchedule(schedule.id, payload);
      } else {
        saved = await scheduleService.createSchedule(payload);
      }
      setSchedule(saved);
      setSuccessMessage('Schedule and working hours saved successfully to PostgreSQL.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Save schedule failed:', err);
      setErrorMessage(err.message || 'Failed to save schedule changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!schedule) {
      setErrorMessage('Please save your schedule settings first before generating slots.');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const today = new Date();
      const fromDate = today.toISOString().split('T')[0];
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 14);
      const toDate = nextWeek.toISOString().split('T')[0];

      const res = await scheduleService.generateSlots(schedule.id, { fromDate, toDate });
      setSlots(res);
      setSuccessMessage(`Successfully generated ${res.length} availability slots for the upcoming 14 days.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Generate slots failed:', err);
      setErrorMessage(err.message || 'Failed to generate availability slots.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredSlots = slots.filter((s) => {
    if (slotFilter === 'ALL') return true;
    return s.status === slotFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => navigate('/settings/profile')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings/security')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Security
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings/notifications')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Notifications
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-xs"
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings/ehr')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          EHR Sync
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#006666]" />
            Clinic Schedule & Hours
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure weekly clinical availability, consultation slot lengths, and AI-enabled slot utilization (CR-03, CR-04).
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <button
            type="button"
            onClick={loadSchedule}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#006666] hover:bg-[#005252] focus:outline-none"
          >
            <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{errorMessage}</div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{successMessage}</div>
        </div>
      )}

      {/* Main Grid: Weekly Hours & Slot Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Weekly Working Hours */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Weekly Working Hours
            </h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Timezone: {timezone}
            </span>
          </div>

          <div className="space-y-4">
            {DAYS_OF_WEEK.map((d) => {
              const current = workingHours.find((w) => w.dayOfWeek === d.day) || {
                dayOfWeek: d.day,
                startTime: '09:00',
                endTime: '17:00',
                isEnabled: false,
              };

              return (
                <div
                  key={d.day}
                  className={`p-3.5 rounded-md border transition-all ${
                    current.isEnabled ? 'bg-white border-gray-200' : 'bg-gray-50/70 border-gray-100 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Day Toggle */}
                    <div className="flex items-center gap-3 w-36">
                      <input
                        type="checkbox"
                        id={`day-${d.day}`}
                        checked={Boolean(current.isEnabled)}
                        onChange={() => handleDayToggle(d.day)}
                        className="h-4 w-4 text-[#006666] focus:ring-[#006666] border-gray-300 rounded"
                      />
                      <label htmlFor={`day-${d.day}`} className="font-medium text-sm text-gray-800 cursor-pointer">
                        {d.name}
                      </label>
                    </div>

                    {/* Time Inputs */}
                    {current.isEnabled ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="text-gray-500">Shift:</span>
                        <input
                          type="time"
                          value={current.startTime}
                          onChange={(e) => handleTimeChange(d.day, 'startTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-[#006666] focus:border-[#006666]"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={current.endTime}
                          onChange={(e) => handleTimeChange(d.day, 'endTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-[#006666] focus:border-[#006666]"
                        />

                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-gray-500">Break:</span>
                        <input
                          type="time"
                          value={current.breakStart || '12:00'}
                          onChange={(e) => handleTimeChange(d.day, 'breakStart', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-[#006666] focus:border-[#006666]"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="time"
                          value={current.breakEnd || '13:00'}
                          onChange={(e) => handleTimeChange(d.day, 'breakEnd', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-[#006666] focus:border-[#006666]"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Clinic Closed / Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Slot Parameters & Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              Slot Parameters
            </h2>

            {/* Slot Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Consultation Slot Duration</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="mt-1.5 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#006666] focus:border-[#006666] rounded-md"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Recommended)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (Comprehensive)</option>
              </select>
            </div>

            {/* Buffer Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Buffer Time Between Appointments</label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="mt-1.5 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#006666] focus:border-[#006666] rounded-md"
              >
                <option value={0}>0 Minutes (Back-to-back)</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Clinical Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-[#006666] focus:border-[#006666]"
              />
            </div>

            {/* AI Slot Generator Trigger (CR-03) */}
            <div className="pt-3 border-t border-gray-100">
              <div className="bg-teal-50/60 p-4 rounded-lg border border-teal-100 space-y-3">
                <div className="flex items-center gap-2 text-[#006666] font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  AI-Enabled Slot Generation (CR-03)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Generate prospective consultation slots from your saved weekly hours. Identifies vacant and cancelled slots for targeted booking.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateSlots}
                  disabled={isGenerating || !schedule}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-xs font-semibold rounded-md text-white bg-[#006666] hover:bg-[#005252] focus:outline-none"
                >
                  <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating Slots...' : 'Generate 14-Day Slots'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Slot Availability & Vacancy Table (CR-03) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Generated Slots & Vacancy Monitor
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing availability generated by the deterministic scheduling engine. Total slots: {slots.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value as any)}
              className="text-xs border-gray-300 rounded px-2.5 py-1.5 focus:ring-[#006666] focus:border-[#006666]"
            >
              <option value="ALL">All Slots ({slots.length})</option>
              <option value="AVAILABLE">Vacant / Available</option>
              <option value="BOOKED">Booked</option>
              <option value="CANCELLED">Cancelled / Reusable</option>
            </select>
          </div>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No slots found for the selected filter. Click &ldquo;Generate 14-Day Slots&rdquo; above to build schedule availability.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time Window</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Capacity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSlots.slice(0, 20).map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{slot.slotDate}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          slot.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-800'
                            : slot.status === 'BOOKED'
                            ? 'bg-blue-100 text-blue-800'
                            : slot.status === 'CANCELLED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {slot.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {slot.currentBookings} / {slot.maxCapacity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {slot.status === 'AVAILABLE' || slot.status === 'CANCELLED' ? (
                        <span className="text-xs text-[#006666] font-medium hover:underline cursor-pointer">
                          Ready for Patient Booking
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Reserved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSlots.length > 20 && (
              <div className="text-center pt-3 text-xs text-gray-500">
                Showing first 20 of {filteredSlots.length} slots.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default ScheduleManagementPage;
