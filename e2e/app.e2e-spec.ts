import { MeanTravellerlistAngular2Page } from './app.po';

describe('travel-manager App', () => {
  let page: MeanTravellerlistAngular2Page;

  beforeEach(() => {
    page = new MeanTravellerlistAngular2Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
