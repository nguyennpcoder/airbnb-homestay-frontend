'use client';

import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { PictureOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import Image from 'next/image';

interface ListingImagePickerProps {
    value?: File;
    onChange?: (file: File | null) => void;
}

const { Dragger } = Upload;

export default function ListingImagePicker({ value, onChange }: ListingImagePickerProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    React.useEffect(() => {
        if (value) {
            const url = URL.createObjectURL(value);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [value]);

    const handleBeforeUpload = (file: File) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Bạn chỉ có thể tải lên tệp hình ảnh!');
            return Upload.LIST_IGNORE;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Hình ảnh phải nhỏ hơn 5MB!');
            return Upload.LIST_IGNORE;
        }

        if (onChange) onChange(file);

        return false; // Prevent automatic upload
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onChange) onChange(null);
    };

    return (
        <div className="w-full">
            {!previewUrl ? (
                <Dragger
                    beforeUpload={handleBeforeUpload}
                    showUploadList={false}
                    className="!bg-gray-50 !rounded-[32px] !border-2 !border-dashed !border-gray-200 hover:!border-black transition-all !p-12 group"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl text-gray-400 group-hover:text-black transition-colors">
                            <CloudUploadOutlined />
                        </div>
                        <div>
                            <p className="ant-upload-text !font-bold !text-xl !text-gray-900">
                                Nhấp hoặc kéo thả ảnh vào đây
                            </p>
                            <p className="ant-upload-hint !text-gray-500 !mt-1">
                                Tải lên ảnh đẹp nhất của bạn làm ảnh bìa.
                                <br />
                                Hỗ trợ JPG, PNG (tối đa 5MB)
                            </p>
                        </div>
                    </div>
                </Dragger>
            ) : (
                <div className="relative aspect-video w-full rounded-[40px] overflow-hidden border-4 border-white shadow-2xl group group-preview-picker">
                    <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            onClick={handleRemove}
                            className="bg-white text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-red-50 hover:text-red-500 transition-all transform hover:scale-105"
                        >
                            <DeleteOutlined /> Thay đổi ảnh
                        </button>
                    </div>
                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Chế độ xem trước
                    </div>
                </div>
            )}
        </div>
    );
}
