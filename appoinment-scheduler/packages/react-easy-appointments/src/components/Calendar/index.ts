import { CalendarRoot } from './Calendar'
import { Toolbar } from '../Toolbar/Toolbar'
import { MonthView } from '../MonthView/MonthView'
import { WeekView } from '../WeekView/WeekView'
import { BookingModal } from '../BookingModal/BookingModal'
import { QuickGenerateModal } from '../QuickGenerateModal/QuickGenerateModal'
import { AdminPanel } from '../AdminPanel/AdminPanel'

export const Calendar = Object.assign(CalendarRoot, {
  Toolbar,
  MonthView,
  WeekView,
  BookingModal,
  QuickGenerateModal,
  AdminPanel,
})
