interface NavIconProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
}

export default function NavIcon({ icon, active, onClick, tooltip }: NavIconProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-[#2d3b4a] hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}
