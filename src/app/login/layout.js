export default function LoginLayout({ children }) {
  return (
    <div>
      <aside>这是 Login 页面的侧边栏</aside>
      <main>{children}</main>
    </div>
  );
}
