# Accessibility Examples

Examples illustrating WCAG-compliant, accessible frontend patterns versus common accessibility anti-patterns.

---

## 1. Semantic Structure & Landmarks

### Good: Native Semantic Elements
```html
<header role="banner">
  <nav aria-label="Main Navigation">
    <ul>
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/settings">Settings</a></li>
    </ul>
  </nav>
</header>
<main id="main-content">
  <h1>Account Settings</h1>
  <section aria-labelledby="profile-heading">
    <h2 id="profile-heading">Profile Information</h2>
    <!-- Content -->
  </section>
</main>
```

### Bad: Non-Semantic Div Soup
```html
<!-- Screen readers cannot discover landmarks or heading hierarchy -->
<div class="header">
  <div class="nav">
    <div class="nav-item" onclick="navigate('/dashboard')">Dashboard</div>
    <div class="nav-item" onclick="navigate('/settings')">Settings</div>
  </div>
</div>
<div class="content">
  <div class="title">Account Settings</div>
</div>
```

---

## 2. Accessible Form Controls & Error Associations

### Good: Explicit Labeling and Live Error Linking
```tsx
interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TextField = ({
  id,
  label,
  value,
  error,
  required,
  onChange,
}: FormFieldProps) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        required={required}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hintId}
        onChange={onChange}
        className={error ? 'input-error' : 'input-default'}
      />

      {error && (
        <span id={errorId} role="alert" className="error-message">
          {error}
        </span>
      )}
    </div>
  );
};
```

### Bad: Missing Labels and Placeholder as Label
```tsx
// Unlabelled input, inaccessible to screen readers, missing aria-invalid and error association
export const BadTextField = ({ value, error, onChange }: any) => (
  <div>
    <input
      type="text"
      placeholder="Enter your username..."
      value={value}
      onChange={onChange}
    />
    {error && <div style={{ color: 'red' }}>{error}</div>}
  </div>
);
```

---

## 3. Keyboard Accessibility & Focus Management in Modals

### Good: Focus Trap, ESC Key Listener, and Focus Restoration
```tsx
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

export const AccessibleModal = ({
  isOpen,
  title,
  onClose,
  triggerRef,
  children,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the modal or first interactive element upon opening
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the triggering element when modal closes
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="modal-container"
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button type="button" onClick={onClose} aria-label="Close dialog">
          Close
        </button>
      </div>
    </div>
  );
};
```

### Bad: Div Overlay with No Keyboard Controls
```tsx
// Inaccessible: cannot be closed via Escape, no focus trapping, focus lost on close
export const BadModal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-body">
        {children}
        <div className="close-btn" onClick={onClose}>X</div>
      </div>
    </div>
  );
};
```

---

## 4. Image Alt Text

### Good: Informative vs Decorative
```html
<!-- Informative image: describes the chart trend -->
<img
  src="/charts/q3-revenue.png"
  alt="Bar chart showing Q3 revenue growth of 18% compared to Q2"
/>

<!-- Decorative image: empty alt ensures screen reader skips it -->
<img src="/icons/decorative-sparkle.svg" alt="" role="presentation" />
```

### Bad: Redundant or Missing Alt
```html
<!-- Bad: redundant words like "image of" -->
<img src="/charts/q3-revenue.png" alt="Image of a chart photo file" />

<!-- Bad: missing alt causes screen reader to announce raw image URL -->
<img src="/user-avatar-129381.jpg" />
```
