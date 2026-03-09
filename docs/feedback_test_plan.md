# Minimal Test Plan: Feedback Widget

## 1. Visual & UX
- [ ] Verify the "Feedback" tab is visible on the right edge of all authenticated pages.
- [ ] Verify the tab is pinned and stays in position during scroll.
- [ ] Verify the tab slides out the panel on click (desktop/mobile).
- [ ] Verify the panel is non-intrusive (doesn't block the whole page).
- [ ] Verify the panel can be closed with the "X" button.
- [ ] Verify the panel remembers the last selected type (CSAT/NPS/Text) within the same session.

## 2. Accessibility
- [ ] Verify the "Feedback" tab can be reached by pressing `Tab`.
- [ ] Verify the panel opens when pressing `Enter` or `Space` on the tab.
- [ ] Verify that focus is trapped within the panel while it is open.
- [ ] Verify the panel closes when pressing the `Esc` key.
- [ ] Verify that focus returns to the "Feedback" tab after closing the panel.
- [ ] Verify ARIA labels and roles are present for screen readers.

## 3. Functionality & Data Capture
- [ ] **CSAT**: Submit a 1-5 rating with an optional comment. Verify success toast.
- [ ] **NPS**: Submit a 0-10 rating with an optional reason. Verify success toast.
- [ ] **Text**: Submit a category and description (min 10 chars). Verify success toast.
- [ ] **Validation**: Try to submit a Text feedback with < 10 chars. Verify error message.
- [ ] **Rate Limiting**: Submit 5 feedbacks within 10 minutes. Verify the 6th submission is blocked with a 429 error.
- [ ] **Data Integrity**: Verify the payload includes `tenantId`, `userId`, `actingAsUserId`, `pageUrl`, `routeName`, and `clientMeta`.

## 4. Branding
- [ ] Verify the font is Montserrat.
- [ ] Verify VIRTUS colors: Teal (#2ED9C3), Blue (#2A7DE1), Navy (#001689).
- [ ] Verify contrast is readable on all elements.

## 5. Backend
- [ ] Verify the `POST /api/feedback` endpoint is hit.
- [ ] Verify the feedback is stored in the mock storage/database.
- [ ] Verify an audit event is created for each submission.
