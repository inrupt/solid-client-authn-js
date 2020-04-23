import { IEnvironmentDetector } from "../EnvironmentDetector";

export const EnvironmentDectorMockResponse = "browser";

export const EnvironmentDetectorMock: jest.Mocked<IEnvironmentDetector> = {
  detect: jest.fn(() => EnvironmentDectorMockResponse)
};
