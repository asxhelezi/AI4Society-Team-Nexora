/** Underlined red "Ndrysho" button (address card, review rows). */
export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap raporto-edit">
      Ndrysho
    </button>
  );
}
