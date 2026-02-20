export type RootTabParamList = {
  首页: undefined;
  课表: undefined;
  广场: undefined;
  个人: undefined;
};

export type RootStackParamList = {
  RootTabs: undefined;
  JiaowuHome: undefined;
  JiaowuProgress: undefined;
  JiaowuRank: undefined;
  JiaowuScore: undefined;
  JiaowuCompetition: undefined;
  JiaowuExam: undefined;
  SecondHome: undefined;
  SecondLogin: undefined;
  SecondActivityList: undefined;
  SecondActivityDetail: { id: string };
  SecondUserInfo: undefined;
  NoticeDetail: { content?: string } | undefined;
  JiaowuNotice: undefined;
  WebViewScreen: { url: string; title?: string };
  ProfileSetting: undefined;
};
