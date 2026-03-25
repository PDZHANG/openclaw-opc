import { getAvatarColor, getAvatarText } from '../utils/avatar';

interface GroupAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function GroupAvatar({ name, size = 40, className = '' }: GroupAvatarProps) {
  const color = getAvatarColor(name);
  const text = getAvatarText(name);
  
  // 判断是否是四个字
  const isFourChars = text.length === 4;
  
  // 根据文字长度调整字体大小
  const fontSize = isFourChars ? size * 0.28 : text.length > 2 ? size * 0.32 : size * 0.4;
  
  // 四个字时上下各2个
  const renderText = () => {
    if (isFourChars) {
      return (
        <div className="flex flex-col items-center justify-center">
          <span>{text.slice(0, 2)}</span>
          <span>{text.slice(2, 4)}</span>
        </div>
      );
    }
    return <span>{text}</span>;
  };
  
  return (
    <div
      className={`flex items-center justify-center rounded-lg font-medium text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: fontSize,
        lineHeight: 1.2
      }}
    >
      {renderText()}
    </div>
  );
}
