import PlaceholderPage from '@/app/components/PlaceholderPage';

const titleMap: Record<string, string> = {
  aircover: 'AirCover',
  discrimination: 'Chống phân biệt đối xử',
  safety: 'An toàn',
  help: 'Trung tâm trợ giúp',
  newsroom: 'Trang tin tức',
  careers: 'Cơ hội nghề nghiệp',
  investors: 'Nhà đầu tư',
  privacy: 'Quyền riêng tư',
  terms: 'Điều khoản',
};

const slug = 'careers';

export default function Page() {
  return <PlaceholderPage title={titleMap[slug] || slug} />;
}
