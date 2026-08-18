'use client';

import React, { useState } from 'react';
import { Upload, Modal, message, Button, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, StarOutlined, StarFilled, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { hostAPI, ListingImage } from '@/lib/api';
import Image from 'next/image';

interface ListingImageUploadProps {
    listingId: number;
    initialImages?: ListingImage[];
    onChange?: (images: ListingImage[]) => void;
}

const { Dragger } = Upload;

export default function ListingImageUpload({ listingId, initialImages = [], onChange }: ListingImageUploadProps) {
    const [images, setImages] = useState<ListingImage[]>(initialImages);
    const [uploading, setUploading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    const handlePreview = (image: ListingImage) => {
        setPreviewImage(image.urlHinhAnh);
        setPreviewOpen(true);
        setPreviewTitle(image.laAnhChinh ? 'Ảnh chính' : 'Ảnh bổ sung');
    };

    const handleDelete = async (maHinhAnh: number) => {
        try {
            const res = await hostAPI.deleteImage(maHinhAnh);
            if (res.wasCover) {
                // Refresh from backend to get the new cover after fallback
                const refreshed = await hostAPI.getImages(listingId);
                const normalizedImages: ListingImage[] = refreshed.map((img: any) => ({
                    maHinhAnh: img.maHinhAnh,
                    urlHinhAnh: img.urlHinhAnh,
                    laAnhChinh: img.laAnhChinh,
                    thuTu: img.thuTu,
                    phanLoaiAnh: img.phanLoaiAnh,
                }));
                setImages(normalizedImages);
                if (onChange) onChange(normalizedImages);
            } else {
                const newImages = images.filter(img => img.maHinhAnh !== maHinhAnh);
                setImages(newImages);
                if (onChange) onChange(newImages);
            }
            message.success('Đã xóa ảnh');
        } catch (error) {
            message.error('Không thể xóa ảnh');
        }
    };

    const handleSetMain = async (maHinhAnh: number) => {
        try {
            // Use the dedicated set-main endpoint which handles both:
            // 1. Updating hinh_anh.la_anh_chinh flags
            // 2. Updating phong.url_anh_chinh (cover image)
            await hostAPI.setMainImage(maHinhAnh);

            // Refresh image list from backend to get consistent state
            const refreshed = await hostAPI.getImages(listingId);
            const normalizedImages: ListingImage[] = refreshed.map((img: any) => ({
                maHinhAnh: img.maHinhAnh,
                urlHinhAnh: img.urlHinhAnh,
                laAnhChinh: img.laAnhChinh,
                thuTu: img.thuTu,
                phanLoaiAnh: img.phanLoaiAnh,
            }));
            setImages(normalizedImages);
            if (onChange) onChange(normalizedImages);
            message.success('Đã thiết lập ảnh chính');
        } catch (error) {
            message.error('Không thể cập nhật ảnh chính');
        }
    };

    const props: UploadProps = {
        name: 'file',
        multiple: true,
        showUploadList: false,
        customRequest: async (options) => {
            const { file, onSuccess, onError } = options;
            setUploading(true);
            try {
                const res = await hostAPI.uploadImage(listingId, file as File, images.length, images.length === 0);
                const newImage: ListingImage = {
                    maHinhAnh: res.maHinhAnh,
                    urlHinhAnh: res.url,
                    laAnhChinh: images.length === 0,
                    thuTu: images.length
                };
                const updatedImages = [...images, newImage];
                setImages(updatedImages);
                if (onChange) onChange(updatedImages);
                if (onSuccess) onSuccess(res);
                message.success(`${(file as File).name} đã được tải lên.`);
            } catch (err) {
                if (onError) onError(err as any);
                message.error(`${(file as File).name} tải lên thất bại.`);
            } finally {
                setUploading(false);
            }
        },
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                    <div
                        key={image.maHinhAnh}
                        className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all group ${image.laAnhChinh ? 'border-[#FF385C] ring-2 ring-[#FF385C]/20' : 'border-gray-100 hover:border-gray-300'
                            }`}
                    >
                        <Image
                            src={image.urlHinhAnh}
                            alt="Listing"
                            fill
                            className="object-cover cursor-pointer"
                            onClick={() => handlePreview(image)}
                        />

                        {image.laAnhChinh && (
                            <div className="absolute top-2 left-2 bg-[#FF385C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                ẢNH CHÍNH
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            {!image.laAnhChinh && (
                                <button
                                    onClick={() => handleSetMain(image.maHinhAnh)}
                                    className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-[#FF385C] hover:text-white transition-colors"
                                    title="Đặt làm ảnh chính"
                                >
                                    <StarOutlined />
                                </button>
                            )}
                            <button
                                onClick={() => handleDelete(image.maHinhAnh)}
                                className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                                title="Xóa ảnh"
                            >
                                <DeleteOutlined />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Dragger {...props} className="!bg-white !rounded-3xl !border-2 !border-dashed !border-gray-200 hover:!border-[#FF385C] !p-8 transition-all">
                <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#FF385C' }} />
                </p>
                <p className="font-bold text-lg text-gray-900">Nhấn hoặc kéo thả ảnh vào đây để tải lên</p>
                <p className="text-gray-400 text-sm mt-1">Hỗ trợ tải lên nhiều ảnh cùng lúc. Ảnh đầu tiên sẽ mặc định là ảnh chính.</p>
                {uploading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-[#FF385C]">
                        <Spin size="small" />
                        <span className="font-medium">Đang tải lên...</span>
                    </div>
                )}
            </Dragger>

            <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={() => setPreviewOpen(false)}
                centered
                width={800}
                className="image-preview-modal"
            >
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mt-4">
                    <Image src={previewImage} alt="Preview" fill className="object-contain" />
                </div>
            </Modal>
        </div>
    );
}
