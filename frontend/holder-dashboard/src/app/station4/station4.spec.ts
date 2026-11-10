import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Station4 } from './station4';

describe('Station4', () => {
  let component: Station4;
  let fixture: ComponentFixture<Station4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Station4],
    }).compileComponents();

    fixture = TestBed.createComponent(Station4);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
