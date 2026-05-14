interface Props {
  text: string;
}

export const DragOverlay = ({ text }: Props) => (
  <div className="rzd-overlay" aria-hidden="true">
    <span className="rzd-overlay__text">{text}</span>
  </div>
);
